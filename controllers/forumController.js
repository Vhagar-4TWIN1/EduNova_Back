const Post = require('../models/post');
const Reply = require('../models/reply');

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { title, content, author } = req.body;
    const post = new Post({ title, content, author });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Get all posts
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'username').sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// Get a single post with replies
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate({
        path: 'replies',
        populate: { path: 'author', select: 'username' }
      });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// Add reply to post
exports.addReplyToPost = async (req, res) => {
  try {
    const { content, author } = req.body;
    const postId = req.params.id;
    const reply = new Reply({ content, author, post: postId });
    await reply.save();

    await Post.findByIdAndUpdate(postId, { $push: { replies: reply._id } });

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
};
