const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const multer = require('multer');

// Configuration de multer pour l'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
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
      const tempPath = `${imagePath}-processed.jpg`;
      await sharp(imagePath)
        .resize(800) 
        .grayscale() 
        .normalize() 
        .sharpen() 
        .toFile(tempPath);
      await fs.promises.rename(tempPath, imagePath);
      console.log('✅ Image prétraitée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du prétraitement de l\'image:', error.message);
      throw new Error('Erreur de prétraitement avec Sharp.');
    }
  };

  const extractDiplomaInfo = (text) => {

    const institutionMatch = text.match(/(MINISTERE DE LA JEUNESSE|UNIVERSITE DE PARIS|Esprit|ESPRIT|esprit|république tunisienne)/i);
    const diplomaTypeMatch = text.match(/DIPLOME DU PROFESSEUR|LICENCE|MASTER|Le Diplôme National d'Ingénieur/i);
    const dateMatch = text.match(/(\d{1,2}[\/\s]*\w+[\/\s]*\d{4})/i); // Adjust regex for different date formats
    const nameMatch = text.match(/(?:à\s+Mr\s*[:|])?\s*([A-Za-zÀ-ÿ\s\-]+(?:\s+[A-Za-zÀ-ÿ]+)+)/i); // Attempt to capture name

  
    return {
      institution: institutionMatch ? institutionMatch[0].trim() : 'Non trouvé',
      diplomaType: diplomaTypeMatch ? diplomaTypeMatch[0].trim() : 'Non trouvé',
      date: dateMatch ? dateMatch[0].trim() : 'Non trouvé',
      name: nameMatch ? nameMatch[1].trim() : 'Non trouvé',
    };
  };
  
  const validateDiploma = (diplomaInfo) => {
    const recognizedInstitutions = [
      "MINISTERE DE LA JEUNESSE",
      "UNIVERSITE DE PARIS",
      "Esprit",
      "république tunisienne",
    ];
  
    const recognizedDiplomaTypes = [
      "DIPLOME DU PROFESSEUR",
      "LICENCE",
      "MASTER",
      "Le Diplôme National d'Ingénieur",
    ];
  
    // Convertir en majuscules pour éviter les problèmes de casse
    const institutionNormalized = diplomaInfo.institution.toUpperCase();
    const diplomaTypeNormalized = diplomaInfo.diplomaType.toUpperCase();
  
    // Check if the institution and diploma type contain recognized keywords
    const isInstitutionValid = recognizedInstitutions.some((inst) =>
      institutionNormalized.includes(inst)
    );
    const isDiplomaTypeValid = recognizedDiplomaTypes.some((type) =>
      diplomaTypeNormalized.includes(type)
    );
  
    const isDateValid = !isNaN(Date.parse(diplomaInfo.date.replace('novembre', 'November'))); // Remplacer les mois français
  
    return {
      isValid: isInstitutionValid && isDiplomaTypeValid && isDateValid,
      errors: {
        institution: isInstitutionValid ? null : 'Institution non reconnue',
        diplomaType: isDiplomaTypeValid ? null : 'Type de diplôme non reconnu',
        date: isDateValid ? null : 'Date de délivrance invalide',
      },
    };
  };
  


exports.verifyDiploma = async (req, res) => {
    try {
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
        console.log('❌ Aucun fichier reçu !');
        return res.status(400).json({ success: false, message: 'Aucun fichier reçu!' });
      }
  
      const imagePath = req.file.path;
      console.log('📂 Fichier reçu:', imagePath);
  
      
      await preprocessImage(imagePath);
  
      const { data: { text ,confidence  } } = await Tesseract.recognize(imagePath, 'fra');
      console.log('OCR Confidence:', confidence);
      console.log('📝 Texte extrait:', text);
      console.log('OCR Confidence:', confidence);
      if (confidence < 50) {
        return res.status(400).json({ success: false, message: 'OCR avec faible confiance.' });
      }
      
      if (!text.trim()) {
        return res.status(400).json({ success: false, message: 'Aucun texte détecté dans l\'image.' });
      }
  
      
      const diplomaInfo = extractDiplomaInfo(text);
      console.log('📊 Informations extraites:', diplomaInfo); // Log extracted info for debugging
  
      
      const validationResult = validateDiploma(diplomaInfo);
  
      if (!validationResult.isValid) {
        return res.status(400).json({ success: false, message: 'Diplôme invalide', errors: validationResult.errors });
      }
  
      
      await unlinkAsync(imagePath);
  
      return res.status(200).json({
        success: true,
        message: 'Diplôme validé avec succès !',
        diplomaInfo,
      });
    } catch (error) {
      console.error(' Erreur interne:', error.message);
      return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
  };
