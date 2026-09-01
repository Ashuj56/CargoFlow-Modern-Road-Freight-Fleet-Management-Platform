const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
  if (io) return io;
  io = new Server(server, {
    cors: {
      origin: [
        process.env.CUSTOMER_PORTAL_URL || 'http://localhost:3000',
        process.env.OWNER_PORTAL_URL || 'http://localhost:3001',
      ],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const { userId, userId: extra } = socket.handshake.auth || {};
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Owner joins all shipment rooms; handled via join calls from handlers.
    socket.on('join:shipment', (shipmentId) => {
      if (shipmentId) socket.join(`shipment:${shipmentId}`);
    });

    socket.on('leave:shipment', (shipmentId) => {
      if (shipmentId) socket.leave(`shipment:${shipmentId}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitToRoom(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { initSocket, getIO, emitToRoom, emitToUser };
