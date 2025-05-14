"use strict";

// chatRouter.js

const {
  v4: uuidv4
} = require('uuid');
module.exports = function (io) {
  // <-- Ensure this is a function
  io.on('connection', socket => {
    console.log('New user connected');
    socket.on('create-room', () => {
      const roomId = uuidv4().slice(0, 8); // small random ID
      socket.join(roomId);
      socket.emit('room-created', roomId);
      console.log('Room created:', roomId);
    });
    socket.on('join-room', roomId => {
      const room = io.sockets.adapter.rooms.get(roomId);
      if (room) {
        socket.join(roomId);
        socket.emit('joined-room', roomId);
        socket.to(roomId).emit('user-joined'); // Notify existing user
        console.log('User joined room:', roomId);
      } else {
        console.log('Room not found:', roomId);
      }
    });
    socket.on('offer', ({
      roomId,
      offer
    }) => {
      socket.to(roomId).emit('offer', offer);
    });
    socket.on('answer', ({
      roomId,
      answer
    }) => {
      socket.to(roomId).emit('answer', answer);
    });
    socket.on('candidate', ({
      roomId,
      candidate
    }) => {
      socket.to(roomId).emit('candidate', candidate);
    });
  });
};