const googleTTS = require('google-tts-api');

exports.generateTTS = (text, lang = 'en', slow = false) => {
  return googleTTS.getAudioUrl(text, { lang, slow, host: 'https://translate.google.com' });
};
