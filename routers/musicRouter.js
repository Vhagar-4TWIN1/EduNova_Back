const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// Configuration multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/music");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// Add this near the top of your musicRouter.js
const preloadedTracks = [
  {
    name: "Sample Track 1",
    url: "/music/preloaded/sample1.mp3",
    isPreloaded: true
  },
  {
    name: "Sample Track 2", 
    url: "/music/preloaded/sample2.mp3",
    isPreloaded: true
  }
];

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
    playlistId: "PLN7m-nA94Vj9YNHAwfVq9mV9cJQtQfMp9", // ID vérifié
    tracks: []
  },
  
};

// Update the fetchYouTubePlaylist function
async function fetchYouTubePlaylist(playlistId) {
  try {
    if (!YOUTUBE_API_KEY) {
      throw new Error("YouTube API key missing");
    }

    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/playlistItems",
      {
        params: {
          part: 'snippet',
          maxResults: 50,
          playlistId: playlistId,
          key: YOUTUBE_API_KEY,
        },
        timeout: 10000,
      }
    );

    return response.data.items.map(item => ({
      id: item.snippet.resourceId.videoId,
      name: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
      isYouTube: true,
      duration: 0 // Will be updated later
    }));
  } catch (error) {
    console.error("YouTube API Error:", {
      status: error.response?.status,
      data: error.response?.data,
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
    res.status(500).json({ error: error.message });
  }
});

router.get("/tracks", async (req, res) => {
  console.log("Fetching tracks...");
  try {
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
    if (youtubePlaylists.study?.tracks?.length === 0) {
      youtubePlaylists.study.tracks = await fetchYouTubePlaylist(youtubePlaylists.study.playlistId);
    }
    youtubeTracks = youtubePlaylists.study?.tracks || [];

    // Combine all tracks
    const allTracks = [
      ...preloadedTracks,
      ...userTracks,
      ...youtubeTracks.map(track => ({ ...track, isYouTube: true }))
    ];

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
router.get("/youtube/search", async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: 'snippet',
          maxResults: 10,
          q: query,
          type: 'video',
          key: YOUTUBE_API_KEY,
          videoCategoryId: '10' // Musique seulement
        }
      }
    );

    const results = response.data.items.map(item => ({
      id: item.id.videoId,
      name: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
      isYouTube: true
    }));

    res.json(results);
  } catch (error) {
    console.error("YouTube Search Error:", error);
    res.status(500).json({ error: "Failed to search YouTube" });
  }
});


// Upload music track (user-uploaded only)
router.post("/upload", upload.single("track"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file uploaded" });
    }

    res.status(200).json({
      message: "Audio uploaded successfully",
      path: req.file.path.replace(/\\/g, "/"),
      url: `/uploads/music/${req.file.filename}`,
      isPreloaded: false
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    res.status(500).json({ message: error.message });
  }
});


router.get("/metadata/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      
      // For preloaded tracks
      const preloadedTrack = preloadedTracks.find(track => track.url.includes(filename));
      if (preloadedTrack) {
        return res.status(200).json({
          duration: preloadedTrack.duration || 180, // default 3 minutes if not specified
          artist: preloadedTrack.artist || "Unknown Artist",
          image: preloadedTrack.image || "/music/preloaded/default_album.jpg"
        });
      }
  
      // For user-uploaded tracks
      const filePath = path.join(__dirname, "../uploads/music", filename);
      
      if (fs.existsSync(filePath)) {
        // In a real app, you'd use a library like music-metadata to extract actual metadata
        return res.status(200).json({
          duration: 180, // Default duration
          artist: "Unknown Artist",
          image: "/music/preloaded/default_album.jpg"
        });
      }
  
      res.status(404).json({ message: "Track not found" });
    } catch (error) {
      console.error("Error fetching track metadata:", error);
      res.status(500).json({ message: "Error fetching track metadata" });
    }
  });
  
  


// Delete music track (user-uploaded only)
router.delete("/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    
    // Prevent deletion of preloaded tracks
    if (preloadedTracks.some(track => track.url.includes(filename))) {
      return res.status(403).json({ message: "Cannot delete preloaded tracks" });
    }

    const filePath = path.join(__dirname, "../uploads/music", filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.status(200).json({ message: "Track deleted successfully" });
    }

    res.status(404).json({ message: "Track not found" });
  } catch (error) {
    console.error("Error deleting track:", error);
    res.status(500).json({ message: "Error deleting track" });
  }
});

module.exports = router;

