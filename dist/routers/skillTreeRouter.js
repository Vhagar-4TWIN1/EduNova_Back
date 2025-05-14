"use strict";

const express = require('express');
const {
  setWebSocketServer,
  getSkillTree,
  createSkillNode,
  updateSkillNode,
  deleteSkillNode
} = require('../controllers/skillTreeController');
const router = express.Router();
function setupSkillTreeRoutes(wss) {
  setWebSocketServer(wss);
  router.get('/lesson/:lessonId', getSkillTree);
  router.post('/', createSkillNode);
  router.patch('/:id', updateSkillNode);
  router.delete('/:id', deleteSkillNode);
  return router;
}
module.exports = setupSkillTreeRoutes;