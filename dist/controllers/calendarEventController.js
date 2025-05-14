"use strict";

const CalendarEvent = require('../models/calendarEvent');
const {
  WebSocketServer,
  WebSocket
} = require('ws');
let wss;
function setWebSocketServer(webSocketServer) {
  wss = webSocketServer;
}
async function getAllEvents(req, res) {
  try {
    const {
      range,
      start,
      end,
      type
    } = req.query;
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const query = {};
    if (start) query.start = {
      $gte: new Date(start)
    };
    if (end) query.end = {
      $lte: new Date(end)
    };
    if (type) query.type = type;
    if (range === 'week') {
      const wkStart = new Date(today);
      wkStart.setDate(today.getDate() - today.getDay());
      const wkEnd = new Date(wkStart);
      wkEnd.setDate(wkStart.getDate() + 7);
      query.start = {
        $gte: wkStart
      };
      query.end = {
        $lte: wkEnd
      };
    } else if (range === 'day') {
      const tmw = new Date(today);
      tmw.setDate(today.getDate() + 1);
      query.start = {
        $gte: today
      };
      query.end = {
        $lte: tmw
      };
    } else if (range === 'upcoming') {
      query.start = {
        $gte: now
      };
    }
    const events = await CalendarEvent.find(query).sort({
      start: 1
    });
    return res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching events:', err);
    return res.status(500).json({
      error: 'Failed to fetch events'
    });
  }
}
async function getEventsByUser(req, res) {
  try {
    const {
      userId
    } = req.params;
    const evs = await CalendarEvent.find({
      userId
    }).populate('lessonId', 'title') // Populate only the title of the related lesson
    .sort({
      start: 1
    });
    return res.status(200).json(evs);
  } catch (err) {
    console.error('Error fetching user events:', err);
    return res.status(500).json({
      error: 'Failed to fetch user events'
    });
  }
}
async function getEventsByLesson(req, res) {
  try {
    const {
      lessonId
    } = req.params;
    const evs = await CalendarEvent.find({
      lessonId
    }).sort({
      start: 1
    });
    return res.status(200).json(evs);
  } catch (err) {
    console.error('Error fetching lesson events:', err);
    return res.status(500).json({
      error: 'Failed to fetch lesson events'
    });
  }
}
async function getEvent(req, res) {
  try {
    const {
      id
    } = req.params;
    const ev = await CalendarEvent.findById(id);
    return ev ? res.status(200).json(ev) : res.status(404).json({
      error: 'Event not found'
    });
  } catch (err) {
    console.error('Error fetching event:', err);
    return res.status(500).json({
      error: 'Failed to fetch event'
    });
  }
}

// calendarEventController.js
// calendarEventController.js

// (no more jwt.verify here)
async function createEvent(req, res) {
  const {
    type,
    title,
    description,
    start,
    end,
    priority,
    lessonId,
    userId
  } = req.body;

  // Validate required fields
  if (!type || !title || !start || !end || !priority) {
    return res.status(400).json({
      error: "Missing required fields"
    });
  }

  // Conditional object
  const eventData = {
    type,
    title,
    description,
    start,
    end,
    priority,
    userId
  };

  // Only include lessonId if the type is 'lesson' and a valid ID is provided
  if (type === "lesson" && lessonId) {
    eventData.lessonId = lessonId;
  }
  try {
    const ev = await CalendarEvent.create(eventData);
    broadcastEventUpdate();
    return res.status(201).json(ev);
  } catch (err) {
    console.error("Error creating event:", err);
    return res.status(500).json({
      error: "Failed to create event"
    });
  }
}
async function updateEvent(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }
    const {
      id
    } = req.params;
    const {
      type,
      title,
      description,
      start,
      end,
      priority,
      lessonId,
      userId
    } = req.body;

    // Validate required fields
    if (!type || !title || !start || !end || !priority) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }
    const updates = {
      type,
      title,
      description,
      start,
      end,
      priority,
      userId
    };

    // Only include lessonId if it's a 'lesson' type and provided
    if (type === "lesson" && lessonId) {
      updates.lessonId = lessonId;
    } else {
      // Remove lessonId if type is changed to something else
      updates.lessonId = undefined;
    }
    const ev = await CalendarEvent.findByIdAndUpdate(id, updates, {
      new: true
    });
    if (!ev) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }
    broadcastEventUpdate();
    return res.status(200).json(ev);
  } catch (err) {
    console.error('Error updating event:', err);
    return res.status(500).json({
      error: 'Failed to update event'
    });
  }
}
async function deleteEvent(req, res) {
  try {
    const {
      id
    } = req.params;
    const ev = await CalendarEvent.findByIdAndDelete(id);
    if (!ev) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }
    broadcastEventUpdate();
    return res.status(200).json({
      message: 'Event deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    return res.status(500).json({
      error: 'Failed to delete event'
    });
  }
}
function broadcastEventUpdate() {
  if (!wss) return;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'events:update'
      }));
    }
  });
}
async function getUpcomingEvents(req, res) {
  try {
    const now = new Date();
    const in30m = new Date(now.getTime() + 30 * 60 * 1000);
    const events = await CalendarEvent.find({
      start: {
        $gte: now.toISOString(),
        $lte: in30m.toISOString()
      }
    }).sort({
      start: 1
    });
    return res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching upcoming events:', err);
    return res.status(500).json({
      error: 'Failed to fetch upcoming events'
    });
  }
}
async function markEventAsRead(req, res) {
  const {
    id
  } = req.params;
  try {
    const ev = await CalendarEvent.findByIdAndUpdate(id, {
      readyEmitted: true
    }, {
      new: true
    });
    if (!ev) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }
    // (optional) broadcast an update to other clients
    if (req.app.locals.wss) {
      req.app.locals.wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'events:update'
          }));
        }
      });
    }
    return res.status(200).json(ev);
  } catch (err) {
    console.error('Error marking event as read:', err);
    return res.status(500).json({
      error: 'Failed to mark event as read'
    });
  }
}
module.exports = {
  setWebSocketServer,
  getAllEvents,
  getEventsByUser,
  getEventsByLesson,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getUpcomingEvents,
  markEventAsRead,
  broadcastEventUpdate
};