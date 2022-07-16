import { ParamsMeta, ParamType } from './utils'
import { plainToClass } from 'class-transformer'
import { validate } from 'class-validator'
import Context from '../context'

export const parseParam = async (ctx: Context, metadata: ParamsMeta) => {
    switch (metadata.type) {
        case ParamType.QUERY:
            return await parseQueryParam(ctx.query, metadata)
        case ParamType.BODY:
            return await parseBodyParam(ctx.body, metadata)
        case ParamType.PARAM:
            return await parseParamParam(ctx.params, metadata)
        case ParamType.CTX:
            return ctx
        case ParamType.FORM_DATA:
            return parseFormDataParam(ctx, metadata)
        case ParamType.COOKIE:
            return ctx.cookies
        default: 
            return null
    }
}

const transformer = (param:string, value: any, paramtype: any) => {
    if (paramtype === Number) {
        if(isNaN(value)) {
            throw new Error(`${param} should be a number, ${typeof value} given`);
        }
        return Number(value)
    }
    if(paramtype(value) && (typeof value === typeof paramtype(value))) {
        return value;
    }
    throw new Error(`${param} should be a ${paramtype.name.toLowerCase()}, ${typeof value} given`);
}

const parseQueryParam = async (query: object, metadata: ParamsMeta) => {
    if (metadata.param) {
        const param = metadata.param;
        const value = query[param];
        const paramtype = metadata.paramtype;
        return transformer(param, value, paramtype)
    } else if(['Object', 'String', 'Boolean', 'Number', 'Array', 'Object'].includes(metadata.paramtype.name)) {
        throw new Error('must define a dto to parse all query params');
    } else {
        let entity = plainToClass(metadata.paramtype, query) as any;
        const errors = await validate(entity);
        if (errors.length > 0) {
            throw new Error(errors.map(err => `${Object.values(err.constraints)?.join(',')}`).join(' | '));
        }
        return entity;
    }
}

const parseBodyParam = async (body: object, metadata: ParamsMeta) => {
    if (metadata.param) {
        const param = metadata.param;
        const value = body[param];
        const paramtype = metadata.paramtype;
        if(paramtype(value) && (typeof value === typeof paramtype(value))) {
            return value;
        }
        throw new Error(`${param} should be a ${paramtype.name.toLowerCase()}, ${typeof value} given`);
    } else if(['Object', 'String', 'Boolean', 'Number', 'Array'].includes(metadata.paramtype.name)) {
        throw new Error('must define a dto to parse all body params');
    } else {
        let entity = plainToClass(metadata.paramtype, body) as any;
        const errors = await validate(entity);
        if (errors.length > 0) {
            throw new Error(errors.map(err => `${Object.values(err.constraints)?.join(',')}`).join(' | '));
        }
        return entity;
    }
}

const parseParamParam = async (params: object, metadata: ParamsMeta) => {
    if (metadata.param) {
        const param = metadata.param;
        const value = params[param];
        const paramtype = metadata.paramtype;
        return transformer(param, value, paramtype)
    } else if(['Object', 'String', 'Boolean', 'Number', 'Array'].includes(metadata.paramtype.name)) {
        throw new Error('must define a dto to parse all param params');
    } else {
        let entity = plainToClass(metadata.paramtype, params) as any;
        const errors = await validate(entity);
        if (errors.length > 0) {
            throw new Error(errors.map(err => `${Object.values(err.constraints)?.join(',')}`).join(' | '));
        }
        return entity;
    }
}

const parseFormDataParam = async (ctx: Context, metadata: ParamsMeta) => {
    if (!ctx.req.headers['content-type']?.includes('multipart/form-data')) return null
    if (metadata.param) {
        const param = metadata.param;
        if(param === 'data') {
            return ctx.body
        } 
        if(param === 'files') {
            return ctx.files
        }
    } else {
        return { data: ctx.body, files: ctx.files };
    }
}