import "reflect-metadata";
import { paramsMap } from './parameter';
import { parseParam } from './parseParams';
import { Methods, MetadataKey } from './utils'
import Context from '../context'

type RouteCallback = (ctx: Context) => Promise<any>

interface Route<T> {
    path: string
    type: Methods
    callback: RouteCallback
    schema?: T
  }
  
let routes: Route<any>[] = []

/**
 * @function 类注解
 * @param routePrefix {String} 路由前缀
 */
export function Controller(routePrefix: string) {
    /**
     * @function 目标拦截
     * @param  target {Function} 当前类的构造函数
     */
    return function (target: Function) {

        for (let key of Object.getOwnPropertyNames(target.prototype)) {
            if (key === 'constructor') continue;
            // 获取构造函数上的原型成员
            const routeHandler = target.prototype[key];
            // 获取原型成员上的路由路径
            const path = Reflect.getMetadata(MetadataKey.PATH, target.prototype, key);
            // 获取原型成员上的方法
            const method: Methods = Reflect.getMetadata(MetadataKey.METHOD, target.prototype, key);
            // 获取原型成员上的中间件
            const middlewares = Reflect.getMetadata(MetadataKey.MIDDLEWARE, target.prototype, key) || [];

            const asyncHandler = func => async (ctx: Context) => {
                const paramValues = [];
                const params = paramsMap.get(routeHandler);
                if (params) {
                    const keys = Object.keys(params);
                    for (const key of keys) {
                        try {
                            paramValues[Number(key)] = await parseParam(ctx, params[key])
                        } catch (err) {
                            ctx.res.statusCode = 400 
                            ctx.res.end('{}');
                            return null;
                        }
                    }
                }
                return Promise
                    .resolve(func(...paramValues))
                    .then((data) => {
                        ctx.res.end(data);
                    })
                    .catch(err => {
                        err = err?.message || err || 'inner server error'
                        ctx.res.statusCode = 500 
                        ctx.res.end('{}');
                    });
            }
            const middlewareAsyncHandler = func => async (ctx: Context) => {
                return Promise
                    .resolve(func(ctx))
                    .catch(err => {
                        err = err?.message || err || 'inner server error'
                        ctx.res.statusCode = 500 
                        ctx.res.end('{}');
                    });
            }
            const asyncHandlerMiddlewares = middlewares.map(middleware => middlewareAsyncHandler(middleware));
            const asyncRouteHandler = asyncHandler(routeHandler);
            // 生成校验器控件
            if (path || path === "") { // 生成路由
               routes.push({
                    path: `${routePrefix}${path}`,
                    type: method,
                    callback: () => null
               })
            }
        }
    }
}
