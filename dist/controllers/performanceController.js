"use strict";

const Performance = require('../models/performance');
const ActivityLog = require('../models/activityLog');
exports.getUsageStats = async (req, res) => {
  try {
    // 🔹 1. Taux d’abandon global
    const usersWithOnlySignup = await ActivityLog.aggregate([{
      $group: {
        _id: "$userId",
        actions: {
          $addToSet: "$action"
        }
      }
    }, {
      $match: {
        actions: {
          $eq: ["SIGNUP"]
        } // uniquement SIGNUP
      }
    }]);
    const totalSignups = await ActivityLog.countDocuments({
      action: "SIGNUP"
    });
    const abandonCount = usersWithOnlySignup.length;
    const abandonRate = totalSignups === 0 ? 0 : abandonCount / totalSignups * 100;

    // 🔹 2. Évolution du taux d’abandon par jour
    const abandonEvolution = await ActivityLog.aggregate([{
      $match: {
        action: {
          $in: ["SIGNUP", "LOGIN"]
        }
      }
    }, {
      $project: {
        action: 1,
        userId: 1,
        date: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
          }
        }
      }
    }, {
      $group: {
        _id: {
          date: "$date",
          userId: "$userId"
        },
        actions: {
          $addToSet: "$action"
        }
      }
    }, {
      $group: {
        _id: "$_id.date",
        total: {
          $sum: 1
        },
        abandons: {
          $sum: {
            $cond: [{
              $eq: ["$actions", ["SIGNUP"]]
            }, 1, 0]
          }
        }
      }
    }, {
      $project: {
        date: "$_id",
        rate: {
          $cond: [{
            $eq: ["$total", 0]
          }, 0, {
            $multiply: [{
              $divide: ["$abandons", "$total"]
            }, 100]
          }]
        },
        _id: 0
      }
    }, {
      $sort: {
        date: 1
      }
    }]);

    // 🔹 3. Heures les plus actives
    const activeHours = await ActivityLog.aggregate([{
      $match: {
        action: "LOGIN"
      }
    }, {
      $project: {
        userId: 1,
        hour: {
          $hour: "$createdAt"
        }
      }
    }, {
      $group: {
        _id: {
          userId: "$userId",
          hour: "$hour"
        },
        count: {
          $sum: 1
        }
      }
    }, {
      $sort: {
        "_id.userId": 1,
        count: -1
      }
    }]);

    // 🔹 4. Envoi de la réponse complète
    res.status(200).json({
      abandonRate: abandonRate.toFixed(2),
      totalSignups,
      abandonCount,
      activeHours,
      abandonEvolution // ✅ très important pour le dashboard
    });
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques :', error);
    res.status(500).json({
      message: 'Erreur serveur',
      error
    });
  }
};