// src/controllers/autoScheduleController.js

const CalendarEvent = require("../models/calendarEvent");
const Module        = require("../models/module");
const { broadcastEventUpdate } = require("./calendarEventController");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.warn("⚠️  You need to set OPENROUTER_API_KEY in your environment!");
}

async function autoSchedule(req, res) {
  const {
    title,
    description = "",
    durationMin,
    priority,
    dueDate,
    moduleId,
    preferredTimeRange,
    userId,
  } = req.body;

  // 0) Validate inputs
  if (!moduleId) {
    return res.status(400).json({ error: "Must provide moduleId" });
  }
  if (!dueDate) {
    return res.status(400).json({ error: "Must provide dueDate" });
  }

  // 1) Prepare dates
  const now      = new Date();
  const deadline = new Date(dueDate);

  // 2) Load existing future events (that end after now and start before the deadline)
  const filter = { userId, end: { $gt: now }, start: { $lt: deadline } };
  const existingEvents = await CalendarEvent.find(filter).sort("start");

  // 3) Load the module and its lessons
  const mod = await Module.findById(moduleId).populate("lessons");
  if (!mod) {
    return res.status(404).json({ error: "Module not found" });
  }
  const lessons = mod.lessons;
  if (!lessons.length) {
    return res.status(400).json({ error: "Module has no lessons" });
  }

  // 4) Build the AI prompt
  let prompt = `Module ID: ${moduleId}
Lessons:
${lessons.map(lsn => ` • ${lsn._id}: ${lsn.title}`).join("\n")}
Duration per lesson: ${durationMin} minutes
Priority: ${priority}
Description: ${description}
`;
  if (preferredTimeRange) {
    prompt += `Preferred window: ${new Date(preferredTimeRange.start).toISOString()} to ${new Date(preferredTimeRange.end).toISOString()}\n`;
  }
  prompt += `Must finish by: ${deadline.toISOString()}

Avoid these future events:
${existingEvents.length
    ? existingEvents.map(ev => ` • ${ev.start.toISOString()} → ${ev.end.toISOString()}`).join("\n")
    : " • none"
}

Schedule these lesson sessions across different days between now and the deadline—do not put them all on the same day.

Please suggest exactly ${lessons.length} non-overlapping time slots (one per lesson) that:
 - each last exactly ${durationMin} minutes
 - start after now
 - end before the deadline

Reply only with a JSON array of objects in this exact form, with no explanations or extra text:

[
  { "lessonId": "<lesson ObjectId>", "start": "<ISO8601>", "end": "<ISO8601>" },
  …
]
`;

  // 5) Call the AI (increase max_tokens to avoid truncation)
  let rawReply;
  try {
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-maverick",
        messages: [
          {
            role: "system",
            content: `
You are EduNova’s AI scheduler.
REPLY WITH ONLY the JSON array of slot objects exactly as shown; no additional text.
`.trim(),
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.0,
        max_tokens: 1000,     // bump up to capture full array
      }),
    });

    const orJson = await orRes.json();
    if (!orRes.ok) {
      throw new Error(orJson.error?.message || `Status ${orRes.status}`);
    }
    rawReply = orJson.choices[0].message.content.trim();
  } catch (err) {
    console.error("AI scheduling error:", err);
    return res.status(502).json({ error: "AI scheduling service failed" });
  }

  // 6) Robustly extract, clean up, and parse the JSON array
  let startIdx = rawReply.indexOf("[");
  let endIdx   = rawReply.lastIndexOf("]");
  if (startIdx < 0 || endIdx < 0) {
    // Fallback: ask AI once more for the complete JSON
    console.warn("Initial reply truncated, re-prompting AI for full JSON...");
    try {
      const fixRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-maverick",
          messages: [
            {
              role: "system",
              content: "Provide only the complete JSON array of slots; no text.",
            },
            { role: "assistant", content: rawReply },
            {
              role: "user",
              content: "Your last response was truncated. Please send the full JSON array now.",
            },
          ],
          temperature: 0.0,
          max_tokens: 500,
        }),
      });
      const fixJson = await fixRes.json();
      const newReply = fixJson.choices?.[0]?.message?.content?.trim() || "";
      rawReply = newReply;
      startIdx = rawReply.indexOf("[");
      endIdx   = rawReply.lastIndexOf("]");
    } catch (e) {
      console.error("Fallback prompt failed:", e);
      return res.status(502).json({ error: "Malformed AI response" });
    }
  }

  if (startIdx < 0 || endIdx < 0) {
    console.error("Malformed AI reply after retry:", rawReply);
    return res.status(502).json({ error: "Malformed AI response" });
  }

  // grab & clean the JSON substring
  let jsonStr = rawReply.slice(startIdx, endIdx + 1);
  jsonStr = jsonStr.replace(/,\s*]$/, "]");  // remove trailing comma

  let slots;
  try {
    slots = JSON.parse(jsonStr);
    if (!Array.isArray(slots)) {
      throw new Error("Parsed value is not an array");
    }
  } catch (err) {
    console.error("JSON parse error:", err, "\nExtracted JSON:", jsonStr);
    return res.status(502).json({ error: "Invalid JSON from AI" });
  }

  // 7) Persist & broadcast each slot as its own lesson event
  const created = [];
  for (const slot of slots) {
    const { lessonId: lId, start: s, end: e } = slot;
    const start = new Date(s);
    const end   = new Date(e);
    if (start <= now || end > deadline) continue;

    try {
      const ev = await CalendarEvent.create({
        title,
        description,
        type: "lesson",
        lessonId: lId,
        start,
        end,
        priority,
        userId,
      });
      created.push(ev);
    } catch (err) {
      console.error("DB error saving slot:", err);
    }
  }

  if (!created.length) {
    return res.status(400).json({ error: "No valid slots scheduled" });
  }

  // 8) Notify and return
  broadcastEventUpdate();
  return res.status(201).json(created);
}

module.exports = { autoSchedule };
