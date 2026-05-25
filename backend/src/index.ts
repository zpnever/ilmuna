import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'

async function bootstrap() {
  await prisma.$connect()
  const app = createApp()
  app.listen(env.PORT, () => {
    console.log(`Ilmuna backend running on http://localhost:${env.PORT}`)
  })
}

bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
