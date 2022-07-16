import * as http from 'http'
import * as util from 'util'
import { EventEmitter } from 'events'
import { Middleware } from './middleware'
import compose from './compose'
import Context from './context'
import { routes } from './decorators/controller'

export default class Application extends EventEmitter {
  server: http.Server
  middleware: Middleware[]
  compose: (middleware: Middleware[]) => Middleware
  
  constructor() {
    super()
    this.middleware = []
    this.compose = compose
  }
  use (wm: Middleware) {
    this.middleware.push(wm)
    return this
  }

  listen (port: number, host = '0.0.0.0') {
    this.server = http.createServer(this.callback())
    return this.server.listen(port, host)
  }

  callback () {
    if (!this.listenerCount('error')) this.on('error', this.onerror)
    const handleRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const ctx = this.createContext(req, res)
      try {
        await ctx.parseBody()
        await ctx.parseFormData()
        return this.handleRequest(ctx).catch(err => {
          throw err
        })
      } catch (err) {
        ctx.onerror(err)
      }
    }
    return handleRequest
  }

  handleRequest (ctx: Context) {
    const res = ctx.res
    res.statusCode = 404
    for (let route of routes) {
      const isMatch = route.pathMatch(ctx.url)
      if (isMatch) {
        if (ctx.req.method === route.type) {
          ctx.res.statusCode = 200
          ctx.pathRegexp = route.path
          ctx.params = isMatch.params
          const onerror = err => ctx.onerror(err)
          const handleResponse = () => ctx.respond()
          const middleware = [...this.middleware, ...route.routeMiddlewares, route.routeHandler]
          const fnMiddleware = this.compose(middleware)
          return fnMiddleware(ctx, null).then(handleResponse).catch(onerror)
        } else {
          ctx.res.statusCode = 405
        }
      }
    }
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
    if (err.status === 404) return
    const msg = err.stack || err.toString()
    console.error(`\n${msg.replace(/^/gm, '  ')}\n`)
  }
}