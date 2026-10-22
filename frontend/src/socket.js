import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (socket) socket.disconnect();
  socket = io('http://localhost:5000', { auth: { token } });
  return socket;
}

export function getSocket() { return socket; }
export function disconnectSocket() { if (socket) { socket.disconnect(); socket = null; } }