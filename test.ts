import App from './src/application'
import Context from './src/context'
import { Next } from './src/middleware'
import { Controller, Body, Post, Use, Param, Query, Get } from './src/decorators'

const app = new App()

class BodyDto {
  p1: string
  p2: number
  p3: boolean
}

app.use(async (ctx: Context, next: Next) => {
  console.log(1111)
  try {
    await next()
  } catch (err) {
    console.log(2222)
    throw err
  }
})

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

@Controller('/api')
class ApiController {
  @Use(mid1)
  @Use(mid2)
  @Post('/test/:id')
  async test1(@Body() body: BodyDto, @Param('id') id: string) {
    return {
      ...body,
      id
    }
  }

  @Use(mid1)
  @Use(mid2)
  @Get('/test/:id')
  async test2(@Param('id') id: string) {
    console.log('dddd', id)
    return {}
  }
}

app.listen(8090)

export default ApiController