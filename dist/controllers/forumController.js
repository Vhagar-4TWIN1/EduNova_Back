"use strict";

const Post = require('../models/post');
const Reply = require('../models/reply');
const {
  analyzeToxicity
} = require('../middlewares/toxicityCheck');
const UserProgress = require('../models/userProgress');
const {
  evaluateAndAssignBadges
} = require("../controllers/userController");
exports.getRecommendedPosts = async userId => {
  try {
    // 1. Get ALL module progress entries for the user
    const userProgresses = await UserProgress.find({
      userId
    }).populate({
      path: 'moduleId',
      select: 'title'
    }).exec();

    // 👉 Return empty array if no user progress
    if (!userProgresses || userProgresses.length === 0) {
      return [];
    }

    // 2. Extract all module titles
    const moduleTitles = userProgresses.map(progress => {
      var _progress$moduleId, _progress$moduleId$ti;
      return ((_progress$moduleId = progress.moduleId) === null || _progress$moduleId === void 0 ? void 0 : (_progress$moduleId$ti = _progress$moduleId.title) === null || _progress$moduleId$ti === void 0 ? void 0 : _progress$moduleId$ti.toLowerCase()) || '';
    }).filter(title => title);

    // 3. Extract keywords
    const allWords = moduleTitles.flatMap(title => title.split(/[\s,.-]+/).filter(Boolean));

    // 4. Filter common words
    const excludeWords = ['and', 'the', 'for', 'with', 'basics', 'fundamentals'];
    const filteredKeywords = [...new Set(allWords.filter(word => word.length > 3 && !excludeWords.includes(word)))];

    // 5. Find matching posts
    const recommendedPosts = await Post.find({
      tags: {
        $in: filteredKeywords.map(keyword => new RegExp(keyword, 'i'))
      }
    }).sort({
      createdAt: -1
    }).limit(5).populate('author', 'username avatar').exec();

    // 6. Return recommended posts
    return recommendedPosts;
  } catch (error) {
    console.error('Error in getRecommendedPosts:', error);
    return [];
  }
};
const ActivityLog = require('../models/activityLog');

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const {
      title,
      content,
      author,
      tags
    } = req.body;
    const parsedTags = Array.isArray(tags) ? tags : tags ? tags.split(',').map(tag => tag.trim()) : [];
    const post = new Post({
      title,
      content,
      author,
      tags: parsedTags
    });
    console.log('Saving post with tags:', post.tags);
    await post.save();
    res.status(201).json(post);
    console.log('REQ.USER:', req.user);
    console.log('REQ.BODY:', req.body);
    const newPost = new Post({
      title: req.body.title,
      content: req.body.content,
      author: req.user.userId // ou ._id selon comment tu stockes dans le JWT
    });
    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'FORUM'
    });
    await evaluateAndAssignBadges(req.user.userId);
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    console.error('Erreur dans createPost:', error.message);
    res.status(500).json({
      error: 'Erreur serveur lors de la création du post.'
    });
  }
};

// Get all posts
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'username').sort({
      createdAt: -1
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch posts'
    });
  }
};
exports.addVoiceReply = async (req, res) => {
  try {
    const postId = req.params.id;
    const author = req.body.author; // This comes from FormData

    if (!req.file) {
      return res.status(400).json({
        error: 'Audio file is required'
      });
    }
    const voicePath = `/uploads/${req.file.filename}`;
    const reply = new Reply({
      post: postId,
      author,
      // Now properly getting from FormData
      voiceUrl: voicePath
    });
    await reply.save();
    await Post.findByIdAndUpdate(postId, {
      $push: {
        replies: reply._id
      }
    });
    res.status(201).json(reply);
  } catch (error) {
    console.error("Error adding voice reply:", error);
    res.status(500).json({
      error: 'Failed to add voice reply'
    });
  }
};

// Get a single post with replies
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username').lean();
    if (!post) {
      return res.status(404).json({
        error: 'Post not found'
      });
    }

    // Use aggregation to sort replies by upvotedBy.length descending
    const sortedRepliesRaw = await Reply.aggregate([{
      $match: {
        post: post._id
      }
    }, {
      $addFields: {
        upvoteCount: {
          $size: {
            $ifNull: ["$upvotedBy", []]
          }
        }
      }
    }, {
      $sort: {
        upvoteCount: -1
      }
    }]);

    // Re-populate author field after aggregation (since populate doesn't work directly with aggregate)
    const sortedReplies = await Reply.populate(sortedRepliesRaw, {
      path: 'author',
      select: 'username'
    });
    post.replies = sortedReplies;
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Failed to fetch post'
    });
  }
};

// Add reply to post
exports.addReplyToPost = async (req, res) => {
  try {
    const {
      content,
      author
    } = req.body;
    const postId = req.params.id;
    const score = await analyzeToxicity(content);
    console.log(score);
    if (score !== null && score >= 0.5) {
      alert('Toxicity detected!');
      return res.status(400).json({
        error: 'Reply content is too toxic'
      });
    }
    const reply = new Reply({
      content,
      author,
      post: postId
    });
    await reply.save();
    await Post.findByIdAndUpdate(postId, {
      $push: {
        replies: reply._id
      }
    });
    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'REPLY_FORUM'
    });
    await evaluateAndAssignBadges(req.user.userId);
    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add reply'
    });
  }
};
exports.upvoteReply = async (req, res) => {
  const replyId = req.params.id;
  const {
    userId
  } = req.user; // Requires auth middleware to set req.user

  try {
    const reply = await Reply.findById(replyId);
    if (!reply) return res.status(404).json({
      message: 'Reply not found'
    });
    if (reply.upvotedBy.includes(userId)) {
      return res.status(400).json({
        message: 'Already upvoted'
      });
    }
    reply.upvotedBy.push(userId);
    reply.upvotes = reply.upvotedBy.length;
    await reply.save();
    res.status(200).json(reply);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
exports.getTopRepliedPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'username') // only get _id and username
    .populate('replies') // optional: remove if you don’t need reply data
    .lean();

    // Sort posts by number of replies
    posts.sort((a, b) => {
      var _b$replies, _a$replies;
      return (((_b$replies = b.replies) === null || _b$replies === void 0 ? void 0 : _b$replies.length) || 0) - (((_a$replies = a.replies) === null || _a$replies === void 0 ? void 0 : _a$replies.length) || 0);
    });

    // Map the top two posts with safe access to author
    const topPosts = posts.slice(0, 2).map(post => {
      var _post$replies;
      return {
        _id: post._id,
        title: post.title,
        content: post.content,
        createdAt: post.createdAt,
        replyCount: ((_post$replies = post.replies) === null || _post$replies === void 0 ? void 0 : _post$replies.length) || 0,
        author: post.author ? {
          _id: post.author._id,
          username: post.author.username
        } : null
      };
    });
    res.json(topPosts);
  } catch (error) {
    console.error("Error fetching top posts:", error);
    res.status(500).json({
      error: 'Failed to fetch top posts',
      details: error.message
    });
  }
};