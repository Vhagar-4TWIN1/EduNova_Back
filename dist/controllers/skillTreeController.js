"use strict";

const SkillNode = require('../models/skillNode');
const {
  WebSocketServer,
  WebSocket
} = require('ws');
let wss;
function setWebSocketServer(webSocketServer) {
  wss = webSocketServer;
}
async function getSkillTree(req, res) {
  try {
    const {
      lessonId
    } = req.params;
    const nodes = await SkillNode.find({
      lessonId
    }).sort({
      'position.x': 1
    });
    return res.status(200).json(nodes);
  } catch (err) {
    console.error('Error fetching skill tree:', err);
    return res.status(500).json({
      error: 'Failed to fetch skill tree'
    });
  }
}
async function createSkillNode(req, res) {
  try {
    const {
      title,
      lessonId,
      parentId,
      position
    } = req.body;
    if (!title || !lessonId) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }
    const node = await SkillNode.create({
      title,
      lessonId,
      parentId: parentId || null,
      position: position || {
        x: 0,
        y: 0
      }
    });
    broadcastSkillTreeUpdate(lessonId);
    return res.status(201).json(node);
  } catch (err) {
    console.error('Error creating skill node:', err);
    return res.status(500).json({
      error: 'Failed to create skill node'
    });
  }
}
async function updateSkillNode(req, res) {
  try {
    const {
      id
    } = req.params;
    const updates = req.body;
    const node = await SkillNode.findByIdAndUpdate(id, updates, {
      new: true
    });
    if (!node) {
      return res.status(404).json({
        error: 'Skill node not found'
      });
    }
    broadcastSkillTreeUpdate(node.lessonId.toString());
    return res.status(200).json(node);
  } catch (err) {
    console.error('Error updating skill node:', err);
    return res.status(500).json({
      error: 'Failed to update skill node'
    });
  }
}
async function deleteSkillNode(req, res) {
  try {
    const {
      id
    } = req.params;
    const node = await SkillNode.findById(id);
    if (!node) {
      return res.status(404).json({
        error: 'Skill node not found'
      });
    }
    await SkillNode.findByIdAndDelete(id);
    broadcastSkillTreeUpdate(node.lessonId.toString());
    return res.status(200).json({
      message: 'Skill node deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting skill node:', err);
    return res.status(500).json({
      error: 'Failed to delete skill node'
    });
  }
}
function broadcastSkillTreeUpdate(lessonId) {
  if (!wss) return;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'skillTree:update',
        payload: {
          lessonId
        }
      }));
    }
  });
}
module.exports = {
  setWebSocketServer,
  getSkillTree,
  createSkillNode,
  updateSkillNode,
  deleteSkillNode
};