
import "reflect-metadata";
import { ParamsMeta, ParamType } from './utils'

export const paramsMap = new WeakMap()

export function params(type: ParamType, param?: string) {
    return function (target: any, methodName: string, paramIndex: number) {
        let paramtypes = Reflect.getMetadata('design:paramtypes', target, methodName)
        const classParams = paramsMap.get(target[methodName]) || {};
        classParams[paramIndex] = {
            type,
            param,
            methodName,
            index: paramIndex,
            paramtype: paramtypes[paramIndex]
        } as ParamsMeta;
        paramsMap.set(target[methodName], classParams);
    }
}

export const Query = (param?: string) => params(ParamType.query, param);
export const Body = (param?: string) => params(ParamType.body, param);
export const Param = (param?: string) => params(ParamType.param, param);
export const File = (param?: string) => params(ParamType.file, param);
export const Req = () => params(ParamType.req);
export const Res = () => params(ParamType.res);
export const Next = () => params(ParamType.next);

