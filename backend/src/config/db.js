const mongoose = require('mongoose');
const dns = require('dns');
const { hasMongo, env } = require('./env');

// Set reliable DNS servers for SRV resolution (fixes querySrv ECONNREFUSED on Windows/ISPs)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // ignore
}

let connected = false;

async function connectDB() {
  if (!hasMongo) {
    console.warn('⚠️  MONGODB_URI not configured. Skipping DB connection (graceful fallback).');
    return false;
  }
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    connected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    connected = false;
    return false;
  }
}

function isConnected() {
  return connected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isConnected, mongoose };
