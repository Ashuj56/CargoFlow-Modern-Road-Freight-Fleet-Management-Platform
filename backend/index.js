require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { env } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const { initSocket } = require('./src/socket');
const { startEmailWorker } = require('./src/queues/workers/email.worker');

const isTest = env.NODE_ENV === 'test';

async function bootstrap() {
  const server = http.createServer(app);
  initSocket(server);

  await Promise.all([connectDB(), connectRedis()]);

  startEmailWorker();

  if (!isTest) {
    server.listen(env.PORT, () => {
      console.log(`\n🚛 CargoFlow API running:`);
      console.log(`   ➜  http://localhost:${env.PORT}`);
      console.log(`   ➜  Health: http://localhost:${env.PORT}/api/health\n`);
    });
  }

  return server;
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

module.exports = { bootstrap };
