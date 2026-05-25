import { config } from 'dotenv'
import { z } from 'zod'

config()

const envSchema = z.object({
  APP_MODE: z.enum(['DEVELOPMENT', 'PRODUCTION']).default('DEVELOPMENT'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
})

const parsedEnv = envSchema.parse(process.env)

export const env = {
  ...parsedEnv,
  IS_PRODUCTION: parsedEnv.APP_MODE === 'PRODUCTION',
}
