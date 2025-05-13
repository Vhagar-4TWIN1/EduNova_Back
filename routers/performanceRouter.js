// routes/performance.js
const express = require('express');
const router = express.Router();
const Performance = require('../models/performance');
const PerformanceController = require('../controllers/performanceController');

const sendToGoogleAnalytics = async (eventData) => {
    try {
      await axios.post('https://www.google-analytics.com/mp/collect', {
        client_id: eventData.userId || 'anonymous',
        events: [{
          name: eventData.action || 'custom_event',
          params: eventData
        }]
      }, {
        params: {
          api_secret: GA_API_SECRET,
          measurement_id: GA_MEASUREMENT_ID
        }
      });
    } catch (err) {
      console.error('Error sending to GA:', err);
    }
  };
  router.post('/performance-track', async (req, res) => {
    try {
      const { category, action, userId, lessonId, lessonTitle } = req.body;
      
      // Enregistrement dans votre base de données
      const newPerformance = new Performance({
        userId,
        category,
        action,
        lessonId,
        lessonTitle
      });
  
      await newPerformance.save();
      
      // Envoi parallèle à Google Analytics
      sendToGoogleAnalytics({
        ...req.body,
        timestamp: new Date().toISOString()
      });
  
      res.status(201).json({ message: 'Performance enregistrée', performance: newPerformance });
    } catch (error) {
      console.error('Erreur enregistrement performance :', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });
  

// Route pour récupérer les performances d'un étudiant
router.get('/performance/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
  
      const performances = await Performance.find({ userId }).sort({ timestamp: -1 });
  
      res.status(200).json(performances);
    } catch (error) {
      console.error('Erreur récupération performances :', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // routes/performance.js - Add this to your existing file

// Route for aggregated performance data
router.get('/performance', async (req, res) => {
    try {
      const { range } = req.query;
      let dateFilter = {};
      
      // Set date range based on query parameter
      const now = new Date();
      switch (range) {
        case '24hours':
          dateFilter = { timestamp: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
          break;
        case '7days':
          dateFilter = { timestamp: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
          break;
        case '30days':
          dateFilter = { timestamp: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
          break;
        default:
          // Default to all time if no range specified
          break;
      }
      
      const performances = await Performance.find(dateFilter)
        .sort({ timestamp: -1 })
        .populate('userId', 'name email') // Populate user data if available
        .populate('lessonId', 'title typeLesson'); // Populate lesson data if available
      
      res.status(200).json(performances);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/stats/usage', PerformanceController.getUsageStats);


module.exports = router;
