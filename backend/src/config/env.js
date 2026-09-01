const z = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default(''),
  JWT_ACCESS_SECRET: z.string().min(10).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(10).default('dev-refresh-secret-change-me'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  UPSTASH_REDIS_REST_URL: z.string().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().default(''),
  GMAIL_USER: z.string().default(''),
  GMAIL_APP_PASSWORD: z.string().default(''),
  CUSTOMER_PORTAL_URL: z.string().default('http://localhost:3000'),
  OWNER_PORTAL_URL: z.string().default('http://localhost:3001'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  env,
  get isDevelopment() {
    return env.NODE_ENV === 'development';
  },
  get isTest() {
    return env.NODE_ENV === 'test';
  },
  get hasRedis() {
    return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  },
  get hasMongo() {
    return Boolean(env.MONGODB_URI);
  },
  get hasGmail() {
    return Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);
  },
};
