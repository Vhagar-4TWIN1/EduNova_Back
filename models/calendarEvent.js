const mongoose = require('mongoose');
const { Schema, model, models } = mongoose;

const CalendarEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['lesson', 'videoChat', 'task', 'focus'],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    completedAt: {
      type: Date,
      default: null,
      index: true      
    },
    start: {
      type: Date,
      required: true,
      index: true
    },
    end: {
      type: Date,
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    roomUrl: {
      type: String,
      trim: true
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: false,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    completed:    { type: Boolean, default: false },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    readyEmitted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

CalendarEventSchema.virtual('durationMin').get(function () {
  const start = this.start instanceof Date ? this.start : new Date(this.start);
  const end = this.end instanceof Date ? this.end : new Date(this.end);
  return Math.round((end - start) / 60000);
});

CalendarEventSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});


CalendarEventSchema.pre('validate', function (next) {
  if (this.end <= this.start) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = models.CalendarEvent
  || model('CalendarEvent', CalendarEventSchema);
