"use strict";

const express = require('express');
const {
  setWebSocketServer,
  getAllEvents,
  getEventsByUser,
  getEventsByLesson,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getUpcomingEvents,
  markEventAsRead
} = require('../controllers/calendarEventController');
const router = express.Router();
function setupEventRoutes(wss) {
  setWebSocketServer(wss);
  router.get('/', getAllEvents);
  router.get('/upcoming', getUpcomingEvents);
  router.get('/user/:userId', getEventsByUser);
  router.get('/lesson/:lessonId', getEventsByLesson);
  router.get('/:id', getEvent);
  router.patch('/:id/read', markEventAsRead);
  router.post('/', createEvent);
  router.patch('/:id', updateEvent);
  router.delete('/:id', deleteEvent);
  return router;
}
module.exports = setupEventRoutes;