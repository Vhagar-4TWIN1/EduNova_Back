const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/diplomas');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage }).single('image');

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
        console.error('❌ Error during file upload:', err);
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
