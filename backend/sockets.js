const jwt = require('jsonwebtoken');

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      next();
    } catch {
      next(new Error('Bad token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user_${socket.user.id}`);
    console.log(`🔌 ${socket.user.username} connected (${socket.id})`);

    socket.on('disconnect', () => {
      console.log(`❌ ${socket.user.username} disconnected`);
    });
  });
};