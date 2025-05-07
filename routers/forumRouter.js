const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { auth } = require("../middlewares/auth");
const upload = require('../middlewares/audioUploads');

// Post routes
router.post('/posts', forumController.createPost);
router.get('/posts', forumController.getAllPosts);
router.get('/posts/:id', forumController.getPostById);
router.post('/posts/:id/reply/audio', upload.single('audio'), forumController.addVoiceReply);
// Reply routes
router.post('/posts/:id/reply', forumController.addReplyToPost);
router.post('/replies/:id/upvote',auth, forumController.upvoteReply);
router.get('/topPosts', forumController.getTopRepliedPosts);

module.exports = router;
