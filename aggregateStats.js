const mongoose = require('mongoose');
const fs = require('fs');
const ActivityLog = require('./models/activityLog');
const connectDB = require('./db'); // Connexion centralisée

async function generateStats() {
  await connectDB();

  const stats = await ActivityLog.aggregate([
    {
      $group: {
        _id: "$userId",
        total_actions: { $sum: 1 },
        total_duration: { $sum: "$duration" },
        nb_login: {
          $sum: { $cond: [{ $eq: ["$action", "LOGIN"] }, 1, 0] }
        },
        nb_lesson: {
          $sum: { $cond: [{ $eq: ["$action", "CHECK_LESSON"] }, 1, 0] }
        },
        last_activity: { $max: "$createdAt" }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user_info"
      }
    },
    {
      $unwind: "$user_info"
    },
    {
      $addFields: {
        email: "$user_info.email"
      }
    },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        email: 1,
        total_actions: 1,
        total_duration: 1,
        nb_login: 1,
        nb_lesson: 1,
        last_activity: 1
      }
    }
  ]);

  fs.writeFileSync('user_stats.json', JSON.stringify(stats, null, 2));
  console.log("✅ Export terminé → user_stats.json");
  mongoose.disconnect();
}

generateStats();
