import * as http from 'http'
import * as crypto from 'crypto'
import { Status } from './utils'
import { Stream } from 'stream'

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

export default class Context {
  requestId: string
  ip = ''
  url = ''
  env: ObjectData = {}
  req: http.IncomingMessage
  res: http.ServerResponse
  params: ObjectData = {}
  query: ObjectData = {}
  body: ObjectData = null
  cookies: ObjectData = {}
  log: ObjectData = {}

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
          // 如果声明了json类型，尝试解析为json
          if (this.req.headers['content-type'].includes('application/json')) {
            this.body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
          }
        } catch (error) {
          this.body= {}
        }
        resolve(null)
      })
    })
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

    const res = this.res
    const req = this.req
    let body = this.body
    const code = res.statusCode
    let data = null
    // ignore body
    if (!Status[code]) {
      // strip headers
      this.body = null
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
    data = JSON.stringify(body)
    res.end(body)
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