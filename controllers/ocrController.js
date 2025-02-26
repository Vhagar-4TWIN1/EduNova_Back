const multer = require('multer');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const sharp = require('sharp');

const unlinkAsync = promisify(fs.unlink);

// Configuration de multer pour l'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Stockage dans 'uploads/'
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage }).single('image');

// Fonction pour prétraiter l'image
const preprocessImage = async (imagePath) => {
  try {
    const tempPath = `${imagePath}-processed.jpg`; // Nouveau fichier temporaire

    await sharp(imagePath)
      .resize(800) 
      .grayscale() 
      .normalize()
      .sharpen()
      .toFile(tempPath); // Sauvegarde dans un nouveau fichier

    // Remplacer l'ancienne image par la nouvelle
    await fs.promises.rename(tempPath, imagePath);

    console.log('✅ Image prétraitée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du prétraitement de l\'image:', error.message);
    throw new Error('Erreur de prétraitement avec Sharp.');
  }
};



// Fonction pour extraire les informations
const extractInfo = (text) => {
  const nomMatch = text.match(/Nom\s*:\s*([^\n]+)/i);
  const prenomMatch = text.match(/Prénom\s*:\s*([^\n]+)/i);
  const emailMatch = text.match(/Email\s*:\s*([a-zA-Z0-9._-]+(?:@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})?)/i); // Regex flexible

  return {
    nom: nomMatch ? nomMatch[1].trim() : 'Non trouvé',
    prenom: prenomMatch ? prenomMatch[1].trim() : 'Non trouvé',
    email: emailMatch ? emailMatch[1].trim() : 'Non trouvé',
  };
};


// Route pour l'upload et l'extraction OCR
exports.uploadImage = async (req, res) => {
  try {
    console.log('🚀 Début du traitement...');

    // Multer Upload
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) {
          console.error('❌ Erreur Multer:', err);
          return reject(err);
        }
        resolve();
      });
    });

    if (!req.file) {
      console.error('❌ Aucun fichier reçu !');
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu!' });
    }

    const imagePath = req.file.path;
    console.log('📂 Fichier reçu:', imagePath);

    // ✅ PREPROCESS IMAGE (Resizing & Optimization)
    try {
      await preprocessImage(imagePath);
    } catch (err) {
      console.error('❌ Erreur de prétraitement:', err.message);
      return res.status(500).json({ success: false, message: 'Erreur de prétraitement d’image.' });
    }

    // ✅ OCR PROCESSING
    let text;
    try {
      const result = await Tesseract.recognize(imagePath, 'fra', { 
        logger: (m) => console.log(m) 
      });
      text = result.data.text;
    } catch (err) {
      console.error('❌ Erreur Tesseract:', err.message);
      return res.status(500).json({ success: false, message: 'Erreur OCR avec Tesseract.' });
    }

    if (!text.trim()) {
      console.error('❌ Aucun texte détecté par Tesseract.');
      return res.status(500).json({ success: false, message: 'Tesseract n’a rien détecté.' });
    }

    console.log('📝 Texte extrait:', text);

    // ✅ EXTRACT INFORMATION
    const { nom, prenom, email } = extractInfo(text);
    console.log('📊 Informations extraites:', { nom, prenom, email });

    // ✅ DELETE IMAGE AFTER PROCESSING
    await unlinkAsync(imagePath);

    return res.json({
      success: true,
      nom,
      prenom,
      email,
      image: `http://localhost:3000/uploads/${req.file.filename}`,
    });

  } catch (err) {
    console.error('🔥 Erreur interne:', err.message);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
};
