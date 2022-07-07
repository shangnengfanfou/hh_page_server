import App from './src/application'
import Context from './src/context'
import { Next } from './src/middleware'

const app = new App()

app.use(async (ctx: Context, next: Next) => {
  console.log(1111)
  await next()
  console.log(2222)
})

app.use(async (ctx: Context, next: Next) => {
  console.log(3333)
  await next()
  console.log(4444)
})

app.use(async (ctx: Context, next: Next) => {
  console.log(5555)
  await next()
  console.log(6666)
})

app.use(async (ctx: Context, next: Next) => {
  console.log(7777)
  await next()
  console.log(8888)
})

app.listen(8090)