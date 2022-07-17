import { App, Context, Next, Controller, Body, Post, Use, Param, Query, Get, FormData, Cookie, Ctx } from './src'
import * as path from 'path'

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
    throw err
  }
  console.log(2222)
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
  async test1(@Body() body: BodyDto, @Param('id') id: string, @Query('test') testStr: string, @FormData() data, @Cookie() cookie) {
    console.log('2323232', data, testStr, cookie)
    return {
      ...body,
      id,
      ...cookie
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

@Controller('/proxy')
class ProxyController {
  @Get('/test1/:id')
  async test1(@Param('id') id: string, @Ctx() ctx: Context) {
    const url = 'http://127.0.0.1:8091/api/stats/overview?startTime=1236&endTime=2323'
    ctx.proxy(url)
  }
  @Get('/test2')
  async test2(@Ctx() ctx: Context) {
    console.log('proxy test2')
    const wait20s = () => new Promise(resolve => setTimeout(resolve, 20000))
    await wait20s()
    return {
      msg: 'proxy test2'
    }
  }

  @Get('/test3')
  async test3(@Ctx() ctx: Context) {
    console.log('proxy test3')
    const chunks = []
    let size = 0
    ctx.req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      size += chunk.length
      // 限制POST JSON的数据大小
      if (size > 1024 * 1024 * 2) {
        ctx.res.statusCode = 413
      }
    })
    ctx.req.on('end', () =>{
      console.log(chunks)
    })
    return {
      msg: 'proxy test3'
    }
  }
}

app.static('views', path.join(__dirname, 'img'))

app.listen(8090)

export default ApiController