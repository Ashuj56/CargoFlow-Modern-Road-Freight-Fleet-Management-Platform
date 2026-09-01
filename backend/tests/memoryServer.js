const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

async function startMemoryServer() {
  if (mongod) return mongod;
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('cargoflow_test');
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890';
  return mongod;
}

async function stopMemoryServer() {
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

module.exports = { startMemoryServer, stopMemoryServer };
