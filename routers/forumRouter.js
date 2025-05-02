const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { auth } = require("../middlewares/auth");

// Post routes
router.post('/posts', forumController.createPost);
router.get('/posts', forumController.getAllPosts);
router.get('/posts/:id', forumController.getPostById);

// Reply routes
router.post('/posts/:id/reply', forumController.addReplyToPost);
router.post('/replies/:id/upvote',auth, forumController.upvoteReply);


module.exports = router;
