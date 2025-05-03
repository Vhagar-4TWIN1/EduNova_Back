const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const UserSkillNodeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  skillNodeId: {
    type: Schema.Types.ObjectId,
    ref: "SkillNode",
    required: true
  },
  unlocked: {
    type: Boolean,
    default: false
  },
  unlockedAt: {
    type: Date
  }
}, { timestamps: true });

UserSkillNodeSchema.index({ userId: 1, skillNodeId: 1 }, { unique: true });

module.exports = models.UserSkillNode || model("UserSkillNode", UserSkillNodeSchema);
