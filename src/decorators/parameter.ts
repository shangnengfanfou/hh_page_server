
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

export const Query = (param?: string) => params(ParamType.QUERY, param);
export const Body = (param?: string) => params(ParamType.BODY, param);
export const Param = (param?: string) => params(ParamType.PARAM, param);
export const Ctx = () => params(ParamType.CTX)
export type FormDataParamType = 'data' | 'files'
export const FormData = (param?: FormDataParamType) => params(ParamType.FORM_DATA, param)
export const Cookie = () => params(ParamType.COOKIE)