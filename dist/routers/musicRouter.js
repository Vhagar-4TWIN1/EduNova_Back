"use strict";

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const ffmpegPath = require('ffmpeg-static');
console.log('FFmpeg path:', ffmpegPath);
const youtubedl = require('youtube-dl-exec');
const {
  auth
} = require("../middlewares/auth");
const ActivityLog = require('../models/activityLog');
const {
  evaluateAndAssignBadges
} = require("../controllers/userController");

// Configuration multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/music");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, {
        recursive: true
      });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});
router.get("/youtube/download/:videoId", async (req, res) => {
  const {
    videoId
  } = req.params;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    res.setHeader("Content-Disposition", `inline; filename="${videoId}.mp3"`);
    res.setHeader("Content-Type", "audio/mpeg");
    const ytdlpProcess = youtubedl.exec(videoUrl, {
      extractAudio: true,
      audioFormat: "mp3",
      output: "-",
      quiet: true,
      ffmpegLocation: ffmpegPath
    });
    ytdlpProcess.stdout.pipe(res);
    ytdlpProcess.stderr.on("data", data => {
      console.error("yt-dlp stderr:", data.toString());
    });
    ytdlpProcess.on("error", err => {
      console.error("yt-dlp failed:", err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Error streaming audio",
          details: err.message
        });
      }
    });
  } catch (err) {
    console.error("Failed to stream video:", err);
    res.status(500).json({
      error: "Failed to stream audio",
      details: err.message
    });
  }
});
router.post("/youtube/save/:videoId", async (req, res) => {
  try {
    const {
      videoId
    } = req.params;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const outputDir = path.join(__dirname, "../uploads/music/preloaded");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, {
        recursive: true
      });
    }

    // Download with yt-dlp
    const result = await youtubedl(videoUrl, {
      extractAudio: true,
      audioFormat: "mp3",
      output: `${outputDir}/%(title)s.%(ext)s`,
      ffmpegLocation: ffmpegPath,
      verbose: true
    });

    // Get the saved filename
    const files = fs.readdirSync(outputDir);
    const savedFile = files.find(f => f.includes(videoId) || f.endsWith('.mp3'));
    if (!savedFile) {
      return res.status(500).json({
        error: "MP3 file not found after download",
        details: "The file was downloaded but couldn't be located"
      });
    }
    const savedPath = path.join(outputDir, savedFile);
    const fileStats = fs.statSync(savedPath);

    // Verify the file exists and has content
    if (fileStats.size === 0) {
      fs.unlinkSync(savedPath);
      return res.status(500).json({
        error: "Downloaded file is empty",
        details: "The audio file was created but contains no data"
      });
    }

    // Get video title from filename
    const title = path.parse(savedFile).name.replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
    const newTrack = {
      id: videoId,
      name: title,
      url: `/uploads/music/preloaded/${savedFile}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/0.jpg`,
      isPreloaded: true,
      isYouTube: true,
      size: fileStats.size,
      duration: 0 // Can be extracted later
    };

    // Add to preloaded tracks if not already present
    if (!preloadedTracks.some(t => t.id === videoId)) {
      preloadedTracks.push(newTrack);
    }
    res.status(200).json({
      message: "YouTube track saved successfully",
      track: newTrack,
      fileInfo: {
        path: savedPath,
        size: formatBytes(fileStats.size),
        modified: fileStats.mtime
      }
    });
  } catch (err) {
    console.error("yt-dlp error:", err);

    // Clean up any partial downloads
    const outputDir = path.join(__dirname, "../uploads/music/preloaded");
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        if (file.includes(req.params.videoId)) {
          fs.unlinkSync(path.join(outputDir, file));
        }
      });
    }
    res.status(500).json({
      error: "Failed to save YouTube video",
      details: err.stderr || err.message,
      suggestion: "Try again later or check the video URL"
    });
  }
});

// Helper function to format file size
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Add this near the top of your musicRouter.js
const preloadedTracks = [{
  name: "Sample Track 1",
  url: "/music/preloaded/sample1.mp3",
  isPreloaded: true
}, {
  name: "Sample Track 2",
  url: "/music/preloaded/sample2.mp3",
  isPreloaded: true
}];
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.mp3', '.wav', '.ogg'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers MP3, WAV ou OGG sont autorisés"), false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

// Configuration YouTube
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const youtubePlaylists = {
  lofi: {
    name: " Study Music",
    playlistId: "PLN7m-nA94Vj9YNHAwfVq9mV9cJQtQfMp9",
    // ID vérifié
    tracks: []
  }
};

// Update the fetchYouTubePlaylist function
async function fetchYouTubePlaylist(playlistId) {
  try {
    if (!YOUTUBE_API_KEY) {
      throw new Error("YouTube API key missing");
    }
    const response = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
      params: {
        part: 'snippet',
        maxResults: 50,
        playlistId: playlistId,
        key: YOUTUBE_API_KEY
      },
      timeout: 10000
    });
    return response.data.items.map(item => {
      var _item$snippet$thumbna, _item$snippet$thumbna2;
      return {
        id: item.snippet.resourceId.videoId,
        name: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        thumbnail: ((_item$snippet$thumbna = item.snippet.thumbnails) === null || _item$snippet$thumbna === void 0 ? void 0 : (_item$snippet$thumbna2 = _item$snippet$thumbna.medium) === null || _item$snippet$thumbna2 === void 0 ? void 0 : _item$snippet$thumbna2.url) || '',
        isYouTube: true,
        duration: 0 // Will be updated later
      };
    });
  } catch (error) {
    var _error$response, _error$response2;
    console.error("YouTube API Error:", {
      status: (_error$response = error.response) === null || _error$response === void 0 ? void 0 : _error$response.status,
      data: (_error$response2 = error.response) === null || _error$response2 === void 0 ? void 0 : _error$response2.data,
      message: error.message
    });
    return [];
  }
}

// Routes
router.get("/youtube/playlists", async (req, res) => {
  try {
    for (const playlist of Object.values(youtubePlaylists)) {
      if (playlist.tracks.length === 0) {
        playlist.tracks = await fetchYouTubePlaylist(playlist.playlistId);
      }
    }
    res.json(youtubePlaylists);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});
router.get("/tracks", async (req, res) => {
  console.log("Fetching tracks...");
  try {
    var _youtubePlaylists$stu, _youtubePlaylists$stu2, _youtubePlaylists$stu3;
    console.log("Checking music directory...");
    // Tracks locales
    const musicDir = path.join(__dirname, "../uploads/music");
    console.log("Music directory exists:", fs.existsSync(musicDir));
    let userTracks = [];
    if (fs.existsSync(musicDir)) {
      const files = fs.readdirSync(musicDir);
      userTracks = files.map(file => ({
        name: path.parse(file).name,
        url: `/uploads/music/${file}`,
        isPreloaded: false,
        isYouTube: false
      }));
    }

    // Tracks YouTube
    let youtubeTracks = [];
    if (((_youtubePlaylists$stu = youtubePlaylists.study) === null || _youtubePlaylists$stu === void 0 ? void 0 : (_youtubePlaylists$stu2 = _youtubePlaylists$stu.tracks) === null || _youtubePlaylists$stu2 === void 0 ? void 0 : _youtubePlaylists$stu2.length) === 0) {
      youtubePlaylists.study.tracks = await fetchYouTubePlaylist(youtubePlaylists.study.playlistId);
    }
    youtubeTracks = ((_youtubePlaylists$stu3 = youtubePlaylists.study) === null || _youtubePlaylists$stu3 === void 0 ? void 0 : _youtubePlaylists$stu3.tracks) || [];

    // Combine all tracks
    const allTracks = [...preloadedTracks, ...userTracks, ...youtubeTracks.map(track => ({
      ...track,
      isYouTube: true
    }))];
    res.json(allTracks);
  } catch (error) {
    console.error("Error in /tracks endpoint:", error);
    res.status(500).json({
      error: "Failed to load tracks",
      details: error.message
    });
  }
});

// Nouvelle route de recherche YouTube
router.get("/youtube/search", auth, async (req, res) => {
  try {
    const {
      query
    } = req.query;
    if (!query) {
      return res.status(400).json({
        error: "Search query is required"
      });
    }
    const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: 'snippet',
        maxResults: 10,
        q: query,
        type: 'video',
        key: YOUTUBE_API_KEY,
        videoCategoryId: '10' // Musique seulement
      }
    });
    const results = response.data.items.map(item => {
      var _item$snippet$thumbna3, _item$snippet$thumbna4;
      return {
        id: item.id.videoId,
        name: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: ((_item$snippet$thumbna3 = item.snippet.thumbnails) === null || _item$snippet$thumbna3 === void 0 ? void 0 : (_item$snippet$thumbna4 = _item$snippet$thumbna3.medium) === null || _item$snippet$thumbna4 === void 0 ? void 0 : _item$snippet$thumbna4.url) || '',
        isYouTube: true
      };
    });
    await ActivityLog.create({
      userId: req.user.userId,
      email: req.user.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'WATCH_MUSIC'
    });
    console.log("User ID:", req.user.userId);
    await evaluateAndAssignBadges(req.user.userId);
    res.json(results);
  } catch (error) {
    console.error("YouTube Search Error:", error);
    res.status(500).json({
      error: "Failed to search YouTube"
    });
  }
});

// Upload music track (user-uploaded only)
router.post("/upload", upload.single("track"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No audio file uploaded"
      });
    }
    res.status(200).json({
      message: "Audio uploaded successfully",
      path: req.file.path.replace(/\\/g, "/"),
      url: `/uploads/music/${req.file.filename}`,
      isPreloaded: false
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    res.status(500).json({
      message: error.message
    });
  }
});
router.get("/metadata/:filename", async (req, res) => {
  try {
    const {
      filename
    } = req.params;

    // For preloaded tracks
    const preloadedTrack = preloadedTracks.find(track => track.url.includes(filename));
    if (preloadedTrack) {
      return res.status(200).json({
        duration: preloadedTrack.duration || 180,
        // default 3 minutes if not specified
        artist: preloadedTrack.artist || "Unknown Artist",
        image: preloadedTrack.image || "/music/preloaded/default_album.jpg"
      });
    }

    // For user-uploaded tracks
    const filePath = path.join(__dirname, "../uploads/music", filename);
    if (fs.existsSync(filePath)) {
      // In a real app, you'd use a library like music-metadata to extract actual metadata
      return res.status(200).json({
        duration: 180,
        // Default duration
        artist: "Unknown Artist",
        image: "/music/preloaded/default_album.jpg"
      });
    }
    res.status(404).json({
      message: "Track not found"
    });
  } catch (error) {
    console.error("Error fetching track metadata:", error);
    res.status(500).json({
      message: "Error fetching track metadata"
    });
  }
});

// Sauvegarder les playlists personnalisées
router.post("/playlists", async (req, res) => {
  try {
    // Dans une vraie application, vous sauvegarderiez en base de données
    // Ici on simule juste avec une réponse réussie
    res.status(200).json({
      message: "Playlist saved successfully"
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to save playlist"
    });
  }
});

// Récupérer les playlists personnalisées
router.get("/playlists", async (req, res) => {
  try {
    // Dans une vraie application, vous récupéreriez depuis la base de données
    // Ici on retourne un exemple
    res.status(200).json([]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load playlists"
    });
  }
});

// Précharger une piste
router.get("/preload/:trackId", async (req, res) => {
  try {
    const {
      trackId
    } = req.params;

    // Trouver la piste
    const track = preloadedTracks.find(t => t.id === trackId) || tracks.find(t => t.id === trackId);
    if (!track) {
      return res.status(404).json({
        error: "Track not found"
      });
    }

    // Si c'est une piste YouTube, on ne peut pas vraiment la précharger
    if (track.isYouTube) {
      return res.status(200).json({
        ...track,
        message: "YouTube tracks can't be fully preloaded"
      });
    }

    // Pour les pistes locales, on peut envoyer le fichier
    const filePath = path.join(__dirname, "../uploads/music", track.filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    res.status(404).json({
      error: "Track file not found"
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to preload track"
    });
  }
});

// In your musicRouter.js
// In your musicRouter.js
router.get("/download/:trackId", async (req, res) => {
  try {
    const {
      trackId
    } = req.params;

    // Find the track in all available sources
    let filePath;

    // Check preloaded tracks first
    const preloadedTrack = preloadedTracks.find(t => t.id === trackId || `/music/preloaded/${trackId}`.includes(t.url));
    if (preloadedTrack) {
      filePath = path.join(__dirname, '../music/preloaded', path.basename(preloadedTrack.url));
      if (fs.existsSync(filePath)) {
        return res.download(filePath);
      }
    }

    // Check uploaded tracks
    const uploadDir = path.join(__dirname, '../uploads/music');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      const uploadedFile = files.find(f => f === trackId || f === `${trackId}.mp3` || f === `${trackId}.MP3`);
      if (uploadedFile) {
        filePath = path.join(uploadDir, uploadedFile);
        return res.download(filePath);
      }
    }
    res.status(404).json({
      error: "Track file not found"
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      error: "Failed to download track"
    });
  }
});

// Fonctions utilitaires
async function getLocalTracks() {
  const musicDir = path.join(__dirname, "../uploads/music");
  if (!fs.existsSync(musicDir)) return [];
  const files = fs.readdirSync(musicDir);
  return files.map(file => ({
    id: `local_${file}`,
    name: path.parse(file).name,
    url: `/uploads/music/${file}`,
    isPreloaded: false,
    isYouTube: false
  }));
}
async function getYouTubeTracks() {
  var _youtubePlaylists$stu4, _youtubePlaylists$stu5, _youtubePlaylists$stu6;
  if (((_youtubePlaylists$stu4 = youtubePlaylists.study) === null || _youtubePlaylists$stu4 === void 0 ? void 0 : (_youtubePlaylists$stu5 = _youtubePlaylists$stu4.tracks) === null || _youtubePlaylists$stu5 === void 0 ? void 0 : _youtubePlaylists$stu5.length) === 0) {
    youtubePlaylists.study.tracks = await fetchYouTubePlaylist(youtubePlaylists.study.playlistId);
  }
  return ((_youtubePlaylists$stu6 = youtubePlaylists.study) === null || _youtubePlaylists$stu6 === void 0 ? void 0 : _youtubePlaylists$stu6.tracks) || [];
}

// Delete music track (user-uploaded only)
router.delete("/:filename", (req, res) => {
  try {
    const {
      filename
    } = req.params;

    // Prevent deletion of preloaded tracks
    if (preloadedTracks.some(track => track.url.includes(filename))) {
      return res.status(403).json({
        message: "Cannot delete preloaded tracks"
      });
    }
    const filePath = path.join(__dirname, "../uploads/music", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.status(200).json({
        message: "Track deleted successfully"
      });
    }
    res.status(404).json({
      message: "Track not found"
    });
  } catch (error) {
    console.error("Error deleting track:", error);
    res.status(500).json({
      message: "Error deleting track"
    });
  }
});
module.exports = router;