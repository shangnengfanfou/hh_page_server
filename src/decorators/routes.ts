import "reflect-metadata";
import { Methods, MetadataKey } from './utils'

/**
 * @function 路由绑定
 * @param method {String} 请求方法
 */
function routeBinder(method: string) {
    /**
     * @function 路径获取
     * @param path {String} 路由路径
     */
    return function (path: string) {
        /**
         * @function 注解
         * @param target {Object} 注解方法所在类的实例
         * @param key {String} 注解方法名
         * @param desc {PropertyDescriptor} 注解方法中的描述符
         */
        return function (target: any, key: string, desc: PropertyDescriptor) {

            // 定义路径（路径名，路径值， 所在类实例， 所在方法名称）
            Reflect.defineMetadata(MetadataKey.PATH, path, target, key);
            // 定义方法（方法名， 方法值， 所在类实例， 所在方法名称）
            Reflect.defineMetadata(MetadataKey.METHOD, method, target, key);
        }
    }
}

export const Get = routeBinder(Methods.GET);
export const Put = routeBinder(Methods.PUT);
export const Post = routeBinder(Methods.POST);
export const Del = routeBinder(Methods.DEL);
export const Patch = routeBinder(Methods.PATCH);