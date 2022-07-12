export enum MetadataKey {
  METHOD = "method",
  PATH = "path",
  MIDDLEWARE = "middleware",
  VALIDATOR = "validator"
}

export enum Methods {
  GET = 'get',
  POST = 'post',
  PATCH = 'patch',
  DEL = 'delete',
  PUT = 'put'
}

export interface ParamsMeta {
  type: ParamType;
  param: string;
  methodName: string;
  index: number;
  paramtype: any;
}

export enum ParamType {
  query = "query",
  body = "body",
  param = "param",
  req = "req", 
  res = "res", 
  next = "next",
  file = "file"
} 