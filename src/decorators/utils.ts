export enum MetadataKey {
  METHOD = "method",
  PATH = "path",
  MIDDLEWARE = "middleware",
  VALIDATOR = "validator"
}

export enum Methods {
  GET = 'GET',
  POST = 'POST',
  PATCH = 'PATCH',
  DEL = 'DELETE',
  PUT = 'PUT'
}

export interface ParamsMeta {
  type: ParamType;
  param: string;
  methodName: string;
  index: number;
  paramtype: any;
}

export enum ParamType {
  QUERY = "query",
  BODY = "body",
  PARAM = "param",
  CTX = "ctx", 
  FORM_DATA = "formData",
  COOKIE = "cookie"
} 