import Context from './context'

export type Next = () => Promise<any>;
export type Middleware = (ctx: Context, next: Next) => any;
