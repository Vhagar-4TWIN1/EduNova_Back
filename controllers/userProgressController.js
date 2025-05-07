const UserProgress = require("../models/userProgress");
const CalendarEvent = require("../models/calendarEvent");
const Module        = require("../models/module");
const mongoose = require("mongoose");

exports.enrollInModule = async (req, res) => {
  const { userId, moduleId } = req.body;
  try {
    const existing = await UserProgress.findOne({ userId, moduleId });
    if (existing) return res.status(200).json({ message: "Already enrolled", enrolled: true });

    const progress = new UserProgress({ userId, moduleId, completedLessons: [] });
    await progress.save();

    res.status(201).json({ message: "Enrolled successfully", enrolled: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.checkEnrollment = async (req, res) => {
  const { userId, moduleId } = req.params;
  try {
    const progress = await UserProgress.findOne({ userId, moduleId });
    res.json({ enrolled: !!progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCompletedLessons = async (req, res) => {
  const { userId, moduleId } = req.params;
  try {
    const progress = await UserProgress.findOne({ userId, moduleId });
    
    // Send the response first
    res.json({ completedLessons: progress ? progress.completedLessons : [] });

    // Perform the update operation after the response
    // Wrap the update operation in a separate try-catch block to ensure it doesn't affect the response
    try {
      await CalendarEvent.updateMany(
        { lessonId, userId },
        { $set: { completed: true, completedAt: new Date() } }
      );
    } catch (updateError) {
      console.error('Error updating calendar events:', updateError);
      // You can handle logging the error, but don't send another response.
    }

  } catch (err) {
    // Handle errors if any part of the process fails
    res.status(500).json({ error: err.message });
  }
};



exports.markLessonCompleted = async (req, res) => {
  const { userId, moduleId, lessonId } = req.body;
  try {
    let progress = await UserProgress.findOne({ userId, moduleId });
    if (!progress) {
      return res.status(400).json({ message: "User is not enrolled in this module." });
    }
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
      await progress.save();
    }
    res.json({ message: "Lesson marked as completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markLessonCompletedForEvent = async (req, res) => {
  const { userId, moduleId, lessonId, eventId } = req.body; // 🛑 Now requires `eventId`

  try {

    let progress = await UserProgress.findOne({ userId, moduleId });
    if (!progress) {
      console.log("No progress found — creating new.");
      progress = new UserProgress({
        userId,
        moduleId,
        completedLessons: [],
        completedTasks: [],
        completedVideoChats: []
      });
    }
    const event = await CalendarEvent.findOne({ _id: eventId, userId, lessonId, type: "lesson" });
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }

    if (!event.completed) {
      event.completed = true;
      event.completedAt = new Date();
      await event.save();
    }

    const lessonEvents = await CalendarEvent.find({ userId, lessonId, type: "lesson" });

    const allCompleted = lessonEvents.length > 0 && lessonEvents.every(ev => ev.completed);

    const alreadyAdded = progress.completedLessons.some(id =>
      new mongoose.Types.ObjectId(id).equals(lessonId)
    );

    if (allCompleted && !alreadyAdded) {
      progress.completedLessons.push(new mongoose.Types.ObjectId(lessonId));
    }

    await progress.save();

    return res.json({ message: "Lesson progress updated successfully." });
  } catch (err) {
    console.error("Error marking lesson completed:", err);
    return res.status(500).json({ error: err.message });
  }
};


exports.markEventCompleted = async (req, res) => {
  const { userId, eventId } = req.body;

  try {
    const event = await CalendarEvent.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    const moduleDoc = await Module.findOne({ "lessons._id": event.lessonId }, { _id: 1 });
    if (!moduleDoc) return res.status(400).json({ message: "Could not find module for this lesson" });
    const moduleId = moduleDoc._id;
    let progress = await UserProgress.findOne({ userId, moduleId });
    if (!progress) {
      progress = new UserProgress({ userId, moduleId, completedLessons: [], completedTasks: [], completedVideoChats: [] });
    }
    if (!event.completed) {
      event.completed   = true;
      event.completedAt = new Date();
      await event.save();
    }

    switch (event.type) {
      case "lesson": {
        const lessonEvents = await CalendarEvent.find({ userId, lessonId: event.lessonId, type: "lesson" });
        if (
          lessonEvents.length === 2 &&
          lessonEvents.every(ev => ev.completed) &&
          !progress.completedLessons.includes(event.lessonId)
        ) {
          progress.completedLessons.push(event.lessonId);
        }
        break;
      }
      case "task":
        if (!progress.completedTasks.includes(event._id)) {
          progress.completedTasks.push(event._id);
        }
        break;
      case "videoChat":
        if (!progress.completedVideoChats.includes(event._id)) {
          progress.completedVideoChats.push(event._id);
        }
        break;
      default:
        return res.status(400).json({ message: "Unsupported event type." });
    }
    await progress.save();
    return res.json({ message: `${event.type} marked as completed` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};


exports.getAllProgressByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    console.log("→ Fetching progress for user:", userId);

    const progresses = await UserProgress.find({ userId });

    let completedLessons = 0;
    let completedTasks = 0;

    if (progresses.length) {
      completedLessons = progresses.reduce((sum, p) => sum + (p.completedLessons?.length || 0), 0);
      completedTasks = progresses.reduce((sum, p) => sum + (p.completedTasks?.length || 0), 0);
    } else {
      const lessonCompletionAgg = await CalendarEvent.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: "lesson" } },
        {
          $group: {
            _id: "$lessonId",
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] }
            }
          }
        },
        { $match: { $expr: { $eq: ["$total", "$completed"] } } },
        { $count: "completedLessons" }
      ]);

      completedLessons = lessonCompletionAgg[0]?.completedLessons || 0;

      completedTasks = await CalendarEvent.countDocuments({
        userId,
        type: "task",
        completed: true
      });
    }

    const totalLessons = await CalendarEvent.distinct("lessonId", {
      userId,
      type: "lesson"
    }).then((lessons) => lessons.filter(Boolean).length);

    const totalTasks = await CalendarEvent.countDocuments({
      userId,
      type: "task"
    });

    const completedEvents = await CalendarEvent.find(
      { userId, completed: true },
      "completedAt"
    );

    const dateSet = new Set(
      completedEvents
        .filter(ev => ev.completedAt)
        .map(ev => ev.completedAt.toISOString().slice(0, 10))
    );

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (dateSet.has(key)) streak++;
      else break;
    }

    return res.json({
      completedLessons,
      completedTasks,
      totalLessons,
      totalTasks,
      streak
    });

  } catch (err) {
    console.error("→ Error in getAllProgressByUser:", err);
    return res.status(500).json({ error: err.message });
  }
};
