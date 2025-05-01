const Performance = require('../models/performance');
const ActivityLog = require('../models/activityLog');

exports.getUsageStats = async (req, res) => {
    try {
      // 1. Taux d’abandon
      const usersWithOnlySignup = await ActivityLog.aggregate([
        {
          $group: {
            _id: "$userId",
            actions: { $addToSet: "$action" }
          }
        },
        {
          $match: {
            actions: { $eq: ["SIGNUP"] }
          }
        }
      ]);
  
      const totalSignups = await ActivityLog.countDocuments({ action: "SIGNUP" });
      const abandonCount = usersWithOnlySignup.length;
      const abandonRate = totalSignups === 0 ? 0 : (abandonCount / totalSignups) * 100;
  
      // 2. Heures les plus actives
      const activeHours = await ActivityLog.aggregate([
        { $match: { action: "LOGIN" } },
        {
          $project: {
            userId: 1,
            hour: { $hour: "$createdAt" }
          }
        },
        {
          $group: {
            _id: { userId: "$userId", hour: "$hour" },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.userId": 1, count: -1 }
        }
      ]);
  
      // 3. Envoi de la réponse
      res.status(200).json({
        abandonRate: abandonRate.toFixed(2),
        totalSignups,
        abandonCount,
        activeHours
      });
  
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques :', error);
      res.status(500).json({ message: 'Erreur serveur', error });
    }
  };
  