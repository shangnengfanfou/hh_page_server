import * as http from 'http'
import * as crypto from 'crypto'
import { Status } from './utils'
import { Stream, PassThrough } from 'stream'
import * as formidable from 'formidable'
import * as httpProxy from 'http-proxy'
import * as path from 'path'
import * as fs from 'fs'
import * as mime from 'mime'

const proxyServer = httpProxy.createProxyServer({
  changeOrigin: true,
  cookiePathRewrite: '/'
});
proxyServer.on('proxyRes', (proxyRes, req) => {
  req.emit('res');
});

interface ObjectData<T = any> {
  [propName: string]: T
}

interface CookieOption {
  name: string
  value: string
  path?: string
  domain?: string
  httpOnly?: boolean
  secure?: boolean
  expires?: number
  sameSite?: 'unspecified' | 'no_restriction' | 'lax' | 'strict'
}

interface File {
  filepath: string
  filename: string
  originalFilename: string
  size: number
  lastModifiedDate: Date
  mimetype: string
  param: string
}

export default class Context {
  requestId: string
  ip = ''
  url = ''
  pathRegexp: RegExp = null
  env: ObjectData = {}
  req: http.IncomingMessage
  res: http.ServerResponse
  params: ObjectData = {}
  query: ObjectData = {}
  body: ObjectData = null
  cookies: ObjectData = {}
  log: ObjectData = {}
  bodyStream: PassThrough
  files: File[] = null
  respData: any
  bodyBuffer: Buffer = null
  isProxy: boolean = false


  // 解析query参数
  parseQuery() {
    let [url, queryStr] = this.req.url.split('?')
    this.url = url
    // querystring被弃用 现在node推荐用URLSearchParams
    if (queryStr) this.query = this.groupParamsByKey(new URLSearchParams(queryStr))
  }

  //可以讲a=b&a=c类型的param解析成{a:['b', 'c']}
  groupParamsByKey(params){
    return [...params.entries()].reduce((acc, tuple) => {
      const [key, val] = tuple;
      if(acc.hasOwnProperty(key)) {
         if(Array.isArray(acc[key])) {
           acc[key] = [...acc[key], val]
         } else {
           acc[key] = [acc[key], val];
         }
      } else {
        acc[key] = val;
      }
      return acc;
     }, {})
  }

  // 解析cookie
  parseCookie() {
    let cookies = this.req.headers.cookie || ''
    let tmp = cookies.split(';')
    for (let item of tmp) {
      let arr = item.split('=').map(key => key.trim())
      if (arr[0] && arr[1]) this.cookies[arr[0]] = arr[1]
    }
  }

  // 解析ip
  parseIp() {
    try {
      this.ip =
        this.req.headers['x-forwarded-for'] as string ||
        this.req.headers['x-real-ip'] as string ||
        this.req.socket.remoteAddress.replace('::ffff:', '')
    } catch (error) {}
  }

  // 解析POST JSON
  parseBody() {
    return new Promise((resolve, reject) => {
      if (this.body !== null) return resolve(null)
      let chunks: Buffer[] = []
      let size = 0
      this.req.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        size += chunk.length
        // 限制POST JSON的数据大小
        if (size > 1024 * 1024 * 2) {
          this.res.statusCode = 413
          reject(413)
        }
      })
      // request数据发送完
      this.req.on('end', () => {
        try {
          const buf = Buffer.concat(chunks)
          const payload = buf.toString('utf-8')
          const contentType = this.req.headers['content-type']
          this.bodyBuffer = buf
          // 如果声明了json类型，尝试解析为json
          if (this.req.headers['content-type'].includes('application/json') && payload) {
            this.body = JSON.parse(payload)
          }
          if (contentType.includes('application/x-www-form-urlencoded') && payload) {
            this.body = this.groupParamsByKey(new URLSearchParams(payload))
          }
          this.bodyStream = new Stream.PassThrough();
          this.bodyStream.end(buf);
        } catch (error) {
          this.body= {}
        }
        resolve(null)
      })
    })
  }

  parseFormData(options = { multiples: true }) {
    return new Promise((resolve, reject) => {
      if (this.body !== null) return resolve(null)
      const contentType = this.req.headers['content-type']
      if (!contentType?.includes('multipart/form-data')) {
          return resolve(null)
      }
      const form = formidable(options);
      form.parse(this.req, (err, fields, files) => {
          if (err)
              reject(err);
          this.body = fields
          let filesArr = []
          for (const param in files) {
            if (Object.prototype.toString.call(files[param]) === '[object Array]') {
              filesArr = filesArr.concat(files[param].map(v => ({
                filepath: v.filepath,
                filename: v.newFilename,
                originalFilename: v.originalFilename,
                size: v.size,
                lastModifiedDate: v.lastModifiedDate,
                mimetype: v.mimetype,
                param
              })))
            }
            if (Object.prototype.toString.call(files[param]) === '[object Object]') {
              const v =files[param]
              filesArr.push({
                filepath: v.filepath,
                filename: v.newFilename,
                originalFilename: v.originalFilename,
                size: v.size,
                lastModifiedDate: v.lastModifiedDate,
                mimetype: v.mimetype,
                param
              })
            }
          }
          this.files = filesArr
          resolve(null);
      });
    });
  }

  // 返回JSON数据
  json(value: any) {
    this.res.setHeader('Content-Type', 'application/json; charset=utf-8')
    this.res.end(JSON.stringify(value))
  }

  /**
   * 设置cookie
   * @param option 
   */
  setCookie(option: CookieOption) {
    let path = option.path || '/'
    let cookie = `${option.name}=${option.value}; Path=${path}`
    if (option.domain) cookie += `; Domain=${option.domain}; `
    if (option.sameSite) cookie += `; SameSite=${option.sameSite}`
    if (option.expires) cookie += `; Expires=${new Date(option.expires).toUTCString()}`
    if (option.secure) cookie += `; Secure`
    if (option.httpOnly) cookie += `; HttpOnly`
    this.res.setHeader('Set-Cookie', cookie)
  }

  /**
   * 删除cookie
   * @param name 
   */
  removeCookie(name: string) {
    this.res.setHeader('Set-Cookie', `${name}=; path=/; Expires=${new Date(0).toUTCString()}`)
  }

  /**
   * 重定向
   * @param url 
   * @param statusCode 
   */
  redirect(url: string, statusCode: 302 | 301 = 302) {
    this.res.statusCode = statusCode
    this.res.setHeader('Location', url)
    this.res.end()
  }

  respond() {
    if (!this.res.writable) return
    if (this.isProxy) return
    const res = this.res
    const req = this.req
    let body = this.respData
    const code = res.statusCode
    let data = null
    // ignore body
    if (!Status[code]) {
      // strip headers
      this.respData = null
      return res.end()
    }

    if (req.method === 'HEAD') {
      return res.end()
    }

    // status body
    if (body == null) {
      if (req.httpVersionMajor >= 2) {
        data = String(code)
      } else {
      }
      return res.end(data)
    }

    // responses
    if (Buffer.isBuffer(body)) return res.end(body)
    if (typeof body === 'string') return res.end(body)
    if (body instanceof Stream) return body.pipe(res)

    // body: json
    res.setHeader('Content-type', 'application/json')
    data = JSON.stringify(body)
    res.end(data)
  }

  onerror (err) {
    const res = this.res
    let statusCode = err.status || err.statusCode || 500
    res.statusCode = statusCode
    const msg = err.message
    res.end(msg)
  }

  proxy(to: string, options = {}) {
    this.isProxy = true
    const url = new URL(to);
    this.req.url = `${url.pathname}${url.search}`
    return new Promise((resolve, reject) => {
        this.req.once('res', resolve);
        const connection = this.req.headers.connection || '';
        const upgrade = this.req.headers.upgrade || '';
        if (connection.toLowerCase() === 'upgrade' &&
            upgrade.toLowerCase() === 'websocket') {
            proxyServer.ws(this.req, this.req.socket, this.req.headers, {
                target: url.origin,
                buffer: this.bodyStream || this.req,
                ...options
            }, (err, req, res) => {
              this.onerror(err)
              resolve(null)
            });
        }
        else {
            proxyServer.web(this.req, this.res, {
                target: url.origin,
                buffer: this.bodyStream || this.req,
                options
            }, (err, req, res: http.ServerResponse) => {
              this.onerror(err)
              resolve(null)
            });
        }
    });
  }

  sendFile(prefix: string, root: string) {
    let exp = new RegExp(`^${prefix}`);
    let target = this.url.replace(exp, '');
    let file = path.join(root, target);
    if (file.startsWith(root) === false) {
        this.res.statusCode = 403;
        return this.res.end();
    }
    if (fs.existsSync(file) === false) {
      this.res.statusCode = 404;
      return this.res.end();
    }
    let stat = fs.statSync(file);
    if (stat.isDirectory() === true) {
      this.res.statusCode = 403;
      return this.res.end();
    }
    let type = mime.getType(file);
    this.res.setHeader('Content-Length', stat.size);
    this.res.setHeader('Content-Type', type);
    fs.createReadStream(file).pipe(this.res);
  }

  constructor(req: http.IncomingMessage, res: http.ServerResponse) {
    this.requestId = crypto.randomBytes(16).toString('hex')
    this.req = req
    this.res = res
    this.body = null
    this.params = {}
    this.parseIp()
    this.parseQuery()
    this.parseCookie()
  }
}