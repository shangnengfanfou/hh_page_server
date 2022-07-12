/*  use.ts中间件方法  */
import 'reflect-metadata';
import { Middleware } from '../middleware'
import { MetadataKey } from './utils'

/**
 * @function 中间件注解
 * @param middleware {RequestHandler} 加入中间件
 */
export function Use(middleware: Middleware) {
    /**
     * @function 目标拦截
     * @param target {Object} 注解目标所在类的实例
     * @param key {String} 注解目标的名称
     * @param desc {Object} 注解目标的属性描述符
     */
    return function(target: any, key: string, desc: PropertyDescriptor) {
        // 获取当前目标定义在当前获取的中间件前面的中间件列表
        const middlewares = Reflect.getMetadata(MetadataKey.MIDDLEWARE, target, key) || [];
        // 合并定义当前目标上的所有中间件
        Reflect.defineMetadata(
            MetadataKey.MIDDLEWARE,
            [...middlewares, middleware],
            target,
            key
        );
    };
}