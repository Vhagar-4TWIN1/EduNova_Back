const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');

const upload = multer({ dest: 'uploads/' });
const app = express();

app.post('/upload-image', upload.single('image'), async (req, res) => {
  const imagePath = path.join(__dirname, 'uploads', req.file.filename);

  try {
   
    const { data: { text } } = await Tesseract.recognize(
      imagePath,  
      'eng',
      {
        logger: (m) => console.log(m),
      }
    );

    res.json({ success: true, text });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
