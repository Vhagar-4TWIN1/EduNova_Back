"use strict";

console.log('🎲 [generateAIAnnotations controller file loaded]');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const {
  SpeechClient
} = require('@google-cloud/speech');
const Tesseract = require('tesseract.js');
const PDFParser = require('pdf-parse');

// Mongoose Lesson model
const Lesson = require('../models/lesson');
// Initialize Google Cloud Speech-to-Text Client
const speechClient = new SpeechClient();

/**
 * Main controller to generate AI annotations for a lesson,
 * handling 'pdf', 'video', 'photo', 'image', 'audio', or 'text'.
 */
async function generateAIAnnotations(req, res) {
  console.log('🔔 [generateAIAnnotations] invoked');
  const lessonId = req.params.id;
  console.log('🔔 Lesson ID:', lessonId, '| UserID:', req.body.userId);
  let lesson;
  try {
    lesson = await Lesson.findById(lessonId);
    console.log('📚 Lesson fetched:', lesson);
  } catch (err) {
    console.error('❌ Error fetching lesson:', err);
    return res.status(500).json({
      error: 'Error fetching lesson',
      details: err.message
    });
  }
  if (!lesson) {
    console.error('❌ Lesson not found:', lessonId);
    return res.status(404).json({
      error: 'Lesson not found'
    });
  }
  const {
    fileUrl,
    typeLesson,
    content: lessonContent
  } = lesson;
  console.log('ℹ️ Raw typeLesson:', typeLesson, '| fileUrl:', fileUrl);

  // Normalize
  const normalizedType = (typeLesson || '').toLowerCase().trim();
  console.log('🔄 Normalized typeLesson:', normalizedType);
  let extractedText = '';
  try {
    switch (normalizedType) {
      case 'text':
        console.log('📖 Processing text');
        extractedText = await handleText(lessonContent);
        break;
      case 'pdf':
        console.log('📄 Processing PDF');
        extractedText = await handlePdf(fileUrl);
        break;
      case 'photo':
      case 'image':
        console.log('🖼️ Processing image');
        extractedText = await handleImage(fileUrl);
        break;
      case 'video':
        console.log('🎞️ Processing video');
        extractedText = await handleVideo(fileUrl);
        break;
      case 'audio':
        console.log('🔊 Processing audio');
        extractedText = await handleAudio(fileUrl);
        break;
      default:
        console.error('❌ Unsupported file type in switch:', normalizedType);
        return res.status(400).json({
          error: ` aaaaaaaaaa: ${typeLesson}`,
          normalizedType
        });
    }
  } catch (err) {
    console.error(`❌ Error extracting text for type [${normalizedType}]:`, err);
    return res.status(400).json({
      error: `Failed to extract text for type ${typeLesson}`,
      details: err.message
    });
  }
  console.log('✅ Extracted text length:', extractedText.length);
  if (!extractedText || extractedText.trim().length < 10) {
    console.error('❌ Extracted text too short');
    return res.status(400).json({
      error: 'Extracted text too short or empty'
    });
  }
  console.log('🤖 Calling AI for annotations');
  let annotations;
  try {
    annotations = await generateAnnotationsFromAI(extractedText);
  } catch (err) {
    console.error('❌ AI annotation generation error:', err);
    return res.status(500).json({
      error: 'AI annotation generation failed',
      details: err.message
    });
  }

  // Append and save
  const newAnnotation = {
    userId: req.body.userId || null,
    highlights: annotations.highlights || [],
    notes: annotations.notes || []
  };
  lesson.annotations.push(newAnnotation);
  try {
    await lesson.save();
    console.log('💾 Annotation saved');
  } catch (err) {
    console.error('❌ Error saving annotation:', err);
    return res.status(500).json({
      error: 'Error saving annotation',
      details: err.message
    });
  }
  return res.status(200).json({
    message: 'AI annotations added successfully',
    added: newAnnotation,
    allAnnotations: lesson.annotations
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────────

async function handleText(content) {
  console.log('📖 handleText');
  if (!content || content.trim().length < 10) throw new Error('Insufficient text content');
  return content;
}
async function handlePdf(url) {
  console.log('📄 handlePdf =>', url);
  const buffer = /^https?:\/\//i.test(url) ? Buffer.from((await axios.get(url, {
    responseType: 'arraybuffer'
  })).data) : fs.readFileSync(path.resolve(url));
  const data = await PDFParser(buffer);
  return data.text.trim();
}
async function handleImage(url) {
  console.log('🖼️ handleImage =>', url);
  return new Promise((resolve, reject) => {
    const src = /^https?:\/\//i.test(url) ? url : path.resolve(url);
    Tesseract.recognize(src, 'eng', {
      logger: m => console.log('Tesseract:', m)
    }).then(({
      data: {
        text
      }
    }) => text && text.trim().length > 0 ? resolve(text.trim()) : reject(new Error('No text found'))).catch(err => reject(err));
  });
}
async function handleVideo(url) {
  console.log('🎞️ handleVideo =>', url);
  const audioPath = await extractAudioFromVideo(url);
  return extractTextFromAudio(audioPath);
}
async function handleAudio(url) {
  console.log('🔊 handleAudio =>', url);
  return extractTextFromAudio(url);
}

// ─── Utilities ────────────────────────────────────────────────────────────────────

function extractAudioFromVideo(videoUrl) {
  console.log('🔉 extractAudioFromVideo =>', videoUrl);
  return new Promise((resolve, reject) => {
    const src = /^https?:\/\//i.test(videoUrl) ? path.resolve('temp/video.mp4') : path.resolve(videoUrl);
    const out = path.resolve('temp/audio-output.wav');
    ffmpeg(src).audioChannels(1).audioFrequency(16000).toFormat('wav').on('end', () => resolve(out)).on('error', err => reject(err)).save(out);
  });
}
async function extractTextFromAudio(audioPath) {
  console.log('🔍 extractTextFromAudio =>', audioPath);
  if (/^https?:\/\//i.test(audioPath)) throw new Error('Remote audio not supported');
  const bytes = fs.readFileSync(path.resolve(audioPath)).toString('base64');
  const request = {
    audio: {
      content: bytes
    },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US'
    }
  };
  const [resp] = await speechClient.recognize(request);
  return resp.results.map(r => r.alternatives[0].transcript).join('\n');
}

// ─── AI ─────────────────────────────────────────────────────────────────────────

async function generateAnnotationsFromAI(fullText) {
  console.log('🤖 generateAnnotationsFromAI', fullText.length);
  const prompt = `
You are EduNova’s AI annotation assistant. Provide only JSON:
{"highlights":[{"text":"str","color":"#RRGGBB"}],"notes":[{"content":"str"}]}
Transcript: ${fullText}
`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-maverick',
      messages: [{
        role: 'system',
        content: 'Return only JSON.'
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0,
      max_tokens: 1000
    })
  });
  if (!response.ok) throw new Error('AI error');
  const data = await response.json();
  const raw = data.choices[0].message.content.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  const parsed = JSON.parse(raw);
  if (!parsed.highlights || !parsed.notes) throw new Error('Invalid JSON');
  return parsed;
}
module.exports = {
  generateAIAnnotations
};