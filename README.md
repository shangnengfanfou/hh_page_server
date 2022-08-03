## 描述
非常喜欢koa2的轻巧简洁以及洋葱模型；nest太庞大比较重但是同时又觉得它的条条框框的框架能够减少很多非必要的错误，因此想结合这两者的优点自己写了一个服务端框架。

## 进度
目前大部分http功能已实现，并且编译成包在个人网页的中台服务中使用。主要如下功能：
- [x] 常见http请求GET/POST/PUT等
- [x] 路由功能
- [x] parseBody
- [x] 参数校验和解析
- [x] proxy
- [x] 洋葱模型

## 使用方法如下
```
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
```