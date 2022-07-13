import App from './src/application'
import Context from './src/context'
import { Next } from './src/middleware'
import { Controller, Body, Post, Use, Param, Query } from './src/decorators'

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

class BodyDto {
  p1: string
  p2: number
  p3: boolean
}


async function mid1(ctx: Context, next: Next) {
  console.log('mid1 start')
  await next()
  console.log('mid1 end')
}

async function mid2(ctx: Context, next: Next) {
  console.log('mid2 start')
  await next()
  console.log('mid2 end')
}

console.log(111)

@Controller('/api')
class ApiController {
  @Use(mid1)
  @Use(mid2)
  @Post('/test/:id')
  async test(@Body() body: BodyDto) {
    console.log('body', body)
    return {}
  }
}

app.listen(8090)

export default ApiController