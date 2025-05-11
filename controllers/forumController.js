const Post = require('../models/post');
const Reply = require('../models/reply');
const { analyzeToxicity } = require('../middlewares/toxicityCheck');

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
exports.addVoiceReply = async (req, res) => {
  try {
    const postId = req.params.id;
    const author = req.body.author; // This comes from FormData

    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const voicePath = `/uploads/${req.file.filename}`;

    const reply = new Reply({
      post: postId,
      author, // Now properly getting from FormData
      voiceUrl: voicePath
    });

    await reply.save();
    await Post.findByIdAndUpdate(postId, { $push: { replies: reply._id } });

    res.status(201).json(reply);
  } catch (error) {
    console.error("Error adding voice reply:", error);
    res.status(500).json({ error: 'Failed to add voice reply' });
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

    const score = await analyzeToxicity(content);
    console.log(score);
    
    if (score !== null && score >= 0.5) {
      alert('Toxicity detected!');
      return res.status(400).json({ error: 'Reply content is too toxic' });
    }

    const reply = new Reply({ content, author, post: postId });
    await reply.save();

    await Post.findByIdAndUpdate(postId, { $push: { replies: reply._id } });

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ error: 'Reply content is too toxic' });
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
exports.getTopRepliedPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username') // only get _id and username
      .populate('replies') // optional: remove if you don’t need reply data
      .lean();

    // Sort posts by number of replies
    posts.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));

    // Map the top two posts with safe access to author
    const topPosts = posts.slice(0, 2).map(post => ({
      _id: post._id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      replyCount: post.replies?.length || 0,
      author: post.author
        ? {
            _id: post.author._id,
            username: post.author.username
          }
        : null
    }));

    res.json(topPosts);
  } catch (error) {
    console.error("Error fetching top posts:", error);
    res.status(500).json({
      error: 'Failed to fetch top posts',
      details: error.message
    });
  }
};


