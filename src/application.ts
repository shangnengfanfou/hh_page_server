import * as http from 'http'
import * as util from 'util'
import { EventEmitter } from 'events'
import { Middleware } from './middleware'
import compose from './compose'
import Context from './context'

export default class Application extends EventEmitter {
  server: http.Server
  middleware: Middleware[]
  compose: (middleware: Middleware[]) => Middleware
  
  constructor() {
    super()
    this.middleware = []
    this.compose = compose
  }

  listen (port: number, host = '0.0.0.0') {
    this.server = http.createServer(this.callback())
    return this.server.listen(port, host)
  }

  callback () {
    const fn = this.compose(this.middleware)
    if (!this.listenerCount('error')) this.on('error', this.onerror)
    const handleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
      const ctx = this.createContext(req, res)
      return this.handleRequest(ctx, fn)
    }

    return handleRequest
  }

  handleRequest (ctx, fnMiddleware) {
    const res = ctx.res
    res.statusCode = 404
    // TODO
    const onerror = err => ctx.onerror(err)
    const handleResponse = () => ctx.respond(ctx)
    // onFinished(res, onerror)
    return fnMiddleware(ctx).then(handleResponse).catch(onerror)
  }

  createContext (req: http.IncomingMessage, res: http.ServerResponse) {
    const context = new Context(req, res)
    context.res.setHeader('X-Request-Id', context.requestId)
    return context
  }

  onerror (err) {
    const isNativeError =
      Object.prototype.toString.call(err) === '[object Error]' ||
      err instanceof Error
    if (!isNativeError) throw new TypeError(util.format('non-error thrown: %j', err))
    if (err.status === 404 || err.expose) return
    const msg = err.stack || err.toString()
    console.error(`\n${msg.replace(/^/gm, '  ')}\n`)
  }
}