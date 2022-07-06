// 中间件compose函数
import { Middleware, Next } from './middleware'
import Context from './context'

export default function compose(middleware: Middleware[]): Middleware {
  return function (context: Context, next: Next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch (i: number) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}