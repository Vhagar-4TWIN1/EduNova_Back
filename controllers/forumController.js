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
      .lean();

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Use aggregation to sort replies by upvotedBy.length descending
    const sortedRepliesRaw = await Reply.aggregate([
      { $match: { post: post._id } },
      {
        $addFields: {
          upvoteCount: { $size: { $ifNull: ["$upvotedBy", []] } }
        }
      },
      { $sort: { upvoteCount: -1 } }
    ]);

    // Re-populate author field after aggregation (since populate doesn't work directly with aggregate)
    const sortedReplies = await Reply.populate(sortedRepliesRaw, { path: 'author', select: 'username' });

    post.replies = sortedReplies;

    res.json(post);
  } catch (error) {
    console.error(error);
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
exports.upvoteReply = async (req, res) => {
  const replyId = req.params.id;
  const {userId} = req.user; // Requires auth middleware to set req.user

  try {
    const reply = await Reply.findById(replyId);
    if (!reply) return res.status(404).json({ message: 'Reply not found' });

    if (reply.upvotedBy.includes(userId)) {
      return res.status(400).json({ message: 'Already upvoted' });
    }

    reply.upvotedBy.push(userId);
    reply.upvotes = reply.upvotedBy.length;

    await reply.save();
    res.status(200).json(reply);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
