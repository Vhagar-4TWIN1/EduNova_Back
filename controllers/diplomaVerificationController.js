const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const multer = require('multer');

<<<<<<< HEAD
// Configuration de multer pour l'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
=======
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/diplomas');
>>>>>>> origin/main
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage }).single('image');

<<<<<<< HEAD
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
=======
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
    console.log('✅ Image preprocessed successfully');
  } catch (error) {
    console.error('❌ Error during image preprocessing:', error.message);
    throw new Error('Image preprocessing failed with Sharp.');
  }
};

const cleanOCRText = (text) => {
  return text.replace(/Abderrabmase/g, 'Abderrahmane')
    .replace(/BEJAI/g, 'Béjaia')
    .replace(/ENSIGNANT/g, 'Enseignant')
    .replace(/vacataire/g, 'vacataire')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const extractDiplomaInfo = (text) => {
  const empleyeenameMatch = text.match(/(?:M\.|Mme|Mr|Ms|m\.|mme|mr)[\s:]+([A-ZÀ-Ýa-zà-ÿ]{2,}(?:\s+[A-ZÀ-Ýa-zà-ÿ]{2,})+)/);
  const employerplaceMatch = text.match(/(Université|Société|Entreprise|Patron)\s*[:|\s]*([A-Za-zÀ-ÿ\s\-]+)/i);
  const positionMatch = text.match(/(enseignant(?: vacataire)?|poste|fonction)/i);
  const startDateMatch = text.match(/(année universitaire|Début|Embauche):?\s*(\d{1,2}[\/\s]*\w+[\/\s]*\d{4})/i);
  const endDateMatch = text.match(/(fin|Contrat terminé|Date de fin):?\s*(\d{1,2}[\/\s]*\w+[\/\s]*\d{4})/i);
  
  return {
    name: empleyeenameMatch ? empleyeenameMatch[1].trim() : 'Non trouvé',
    place: employerplaceMatch ? employerplaceMatch[2].trim() : 'Non trouvé',
    position: positionMatch ? positionMatch[0].trim() : 'Non trouvé',
    periode: startDateMatch ? startDateMatch[2].trim() : 'Non trouvé',
    endDate: endDateMatch ? endDateMatch[2].trim() : 'Non trouvé',
  };
};

const validateDiploma = (diplomaInfo) => {
  const isEmployerValid = diplomaInfo.place !== 'Non trouvé';
  const isPositionValid = diplomaInfo.position !== 'Non trouvé';

  const startDateStr = parseAcademicYearStart(diplomaInfo.periode);
  const endDateStr = parseAcademicYearEnd(diplomaInfo.periode);

  const isStartDateValid = startDateStr && !isNaN(Date.parse(startDateStr));
  const isEndDateValid = endDateStr && !isNaN(Date.parse(endDateStr));

  return {
    isValid: isEmployerValid && isPositionValid && isStartDateValid && isEndDateValid,
    errors: {
      employer: isEmployerValid ? null : 'Employeur non reconnu',
      position: isPositionValid ? null : 'Position non reconnue',
      startDate: isStartDateValid ? null : 'Date de début invalide',
      endDate: isEndDateValid ? null : 'Date de fin invalide',
    },
  };
};

const parseAcademicYearStart = (periode) => {
  if (!periode || !periode.includes('/')) return null;
  const [startYear] = periode.split('/');
  return `${startYear}-09-01`;
};

const parseAcademicYearEnd = (periode) => {
  if (!periode || !periode.includes('/')) return null;
  const [, endYear] = periode.split('/');
  return `${endYear}-07-01`;
};

exports.verifyDiploma = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      } else if (err) {
        return res.status(500).json({ 
          success: false, 
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file received!' 
        });
      }

      const imagePath = req.file.path;
      console.log('📂 File received:', imagePath);

      try {
        await preprocessImage(imagePath);

        const { data: { text, confidence } } = await Tesseract.recognize(imagePath, 'fra');
        console.log('OCR Confidence:', confidence);
        console.log('📝 Extracted text:', text);

        if (confidence < 50) {
          await unlinkAsync(imagePath);
          return res.status(400).json({ 
            success: false, 
            message: 'Low OCR confidence.' 
          });
        }

        if (!text.trim()) {
          await unlinkAsync(imagePath);
          return res.status(400).json({ 
            success: false, 
            message: 'No text detected in the image.' 
          });
        }

        const cleanedText = cleanOCRText(text);
        const diplomaInfo = extractDiplomaInfo(cleanedText);
        console.log('📊 Extracted information:', diplomaInfo);

        const validationResult = validateDiploma(diplomaInfo);

        // Generate a unique certificate URL
        const certificateURL = `certificate-${Date.now()}`;

        // Delete the temporary file
        await unlinkAsync(imagePath);

        if (!validationResult.isValid) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid diploma', 
            errors: validationResult.errors 
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Diploma validated successfully!',
          diplomaInfo,
          certificateURL: certificateURL
        });
      } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
          await unlinkAsync(req.file.path);
        }
        console.error('Processing error:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Internal server error.' 
        });
      }
    });
  } catch (error) {
    console.error('Controller error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error.' 
    });
  }
};
>>>>>>> origin/main
