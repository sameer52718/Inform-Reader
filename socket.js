import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
let io;

const webUser = new Map();
const appUser = new Map();

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const { platform, token } = socket.handshake.query;
    const deocded = jwt.decode(token);
    console.log(socket.id);
    
    socket.on('joinChennel', (data) => {
      const { chennelId } = data;
      console.log('joinChennel', chennelId);
      socket.join(chennelId);
    });

    socket.on('leaveChennel', (data) => {
      const { chennelId } = data;
      console.log('leaveChennel', chennelId);
      socket.leave(chennelId);
    });

    socket.on('disconnect', (reason) => {
      // webUser.delete(deocded.id);
      // appUser.delete(deocded.id);
      // console.log(deocded.id, reason);
    });
  });
};

export const getIo = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Please call initializeSocket first.');
  }
  return io;
};