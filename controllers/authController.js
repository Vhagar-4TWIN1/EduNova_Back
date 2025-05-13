const ActivityLog = require('../models/activityLog');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const passport = require("passport");
const multer = require('multer');
const path = require('path');
const fs = require ('fs');
const axios = require('axios');
const { diplomaVerificationController } = require('./diplomaVerificationController');
const mongoose = require('mongoose');
const { evaluateAndAssignBadges } = require("../controllers/userController");





const {
  signupSchema,
  signinSchema,
  acceptCodeSchema,
  changePasswordSchema,
  acceptFPCodeSchema,
} = require("../middlewares/validator");
const {User} = require("../models/usersModel");
const { doHash, doHashValidation, hmacProcess } = require("../utils/hashing");
const { transport, transport2 } = require("../middlewares/sendMail");



  //gemini
  exports.authenticate = (req, res, next) => {
    try {
      const token = req.cookies.Authorization?.split(' ')[1] || 
                   req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
  
      const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  };

//


//upload profile pic 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage }).single('image');

// Fonction pour uploader l'image de profil
exports.uploadProfileImage = (req, res) => {
  // Ensure uploads directory exists
  const uploadDir = 'uploads/profiles';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }



  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    } else if (err) {
      // An unknown error occurred
      console.error('Upload error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'File upload failed',
        error: err.message 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file received!' 
      });
    }

    try {
      // Construct accessible URL
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      
      res.status(200).json({ 
        success: true, 
        imagePath: imageUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error('Error processing upload:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error processing file upload' 
      });
    }
  });
};


exports.signup = async (req, res) => {
  try {
    // Get reCAPTCHA token from headers
    const recaptchaToken = req.headers['recaptcha-token'];
    
    if (!recaptchaToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'reCAPTCHA token is required' 
      });
    }

    // Verify reCAPTCHA with Google
    const recaptchaResponse = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    );

    if (!recaptchaResponse.data.success) {
      console.log('reCAPTCHA verification details:', recaptchaResponse.data);
      return res.status(400).json({ 
        success: false, 
        message: 'reCAPTCHA verification failed' 
      });
    }

    const {
      firstName,
      lastName,
      age,
      email,
      password,
      country,
      photo,
      role,
      // admin fields
      cin,
      number,
      bio,
      cv,
      experience,
      // student fields
      identifier,
      situation,
      disease,
      socialCase
    } = req.body;

    const { error } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser;

    if (role === "Teacher") {
      // For teachers, we expect diploma verification 

      if (!req.body.workCertificate) {
        return res.status(400).json({ 
          success: false, 
          message: 'Diploma verification is required for teachers' 
        });
      }

      newUser = await User.discriminators.Teacher.create({
        firstName,
        lastName,
        age,
        email,
        password: hashedPassword,
        country,
        photo,
        role,
        number,
        bio,
        cv,
        experience,
        //cin :req.body.cin || null,
        workCertificate: req.body.workCertificate,
        verified: true,
      });
    } else if (role === "Admin") {
      newUser = await User.discriminators.Admin.create({
        firstName,
        lastName,
        age,
        email,
        password: hashedPassword,
        country,
        photo,
        role,
        cin,
        number,
      });
    } else if (role === "Student") {
      newUser = await User.discriminators.Student.create({
        firstName,
        lastName,
        age,
        email,
        password: hashedPassword,
        country,
        photo,
        role,
        identifier,
        situation,
        disease,
        socialCase
      });
    }

    const token = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.TOKEN_SECRET,
      { expiresIn: '8h' }
    );

    // Log the signup activity
    await ActivityLog.create({
      userId: newUser._id,
      email: newUser.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'SIGNUP',
    });
    await evaluateAndAssignBadges(newUser._id);

    res.status(201)
      .cookie('Authorization', 'Bearer ' + token, {
        expires: new Date(Date.now() + 8 * 3600000),
        httpOnly: process.env.NODE_ENV === 'production',
        secure: process.env.NODE_ENV === 'production',
      })
      .json({
        success: true,
        token, // Include the token in the response
        message: `${role} created successfully!`,
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          photo: newUser.photo,
        },
      });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add this helper function to authController.js
async function verifyDiploma(diplomaImage) {
  try {
    // Create a mock request object for the verification controller
    const mockReq = {
      file: {
        path: diplomaImage, // This should be the path to the uploaded image
        originalname: 'diploma.jpg'
      },
      user: {} // Mock user object
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => data
      })
    };

    // Call the verification controller
    const result = await diplomaVerificationController.verifyDiploma(mockReq, mockRes);
    return result;
  } catch (error) {
    console.error('Diploma verification error:', error);
    return {
      success: false,
      message: 'Diploma verification failed',
      errors: { system: 'Verification process error' }
    };
  }
}




exports.signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate the request using Joi schema
    const { error, value } = signinSchema.validate({ email, password });
    if (error) {
      return res.status(401).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Find the user in the database
    const existingUser = await User.findOne({ email }).select('+password');
    if (!existingUser) {
      return res.status(401).json({
        success: false,
        message: 'User does not exist!',
      });
    }

    // Check if the user is OAuth (password will be 'password' for OAuth users)
    if (password !== 'password') {
      // If the password is not 'password' (i.e., it's not an OAuth user), compare the hashed password
      const passwordMatch = await bcrypt.compare(password, existingUser.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials!',
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        role: existingUser.role,
      },
      process.env.TOKEN_SECRET,
      { expiresIn: '8h' }
    );
    console.log(existingUser._id)
    console.log("logged in")

    // Check for active sessions within the last 8 hours
    const activeSessions = await ActivityLog.find({
      userId: existingUser._id,
      action: 'LOGIN',
      createdAt: { $gte: new Date(Date.now() - 8 * 3600000) },
    });

    // Get previous IPs and user agents from active sessions
    const previousIPs = new Set(activeSessions.map(session => session.ipAddress));
    const previousUserAgents = new Set(activeSessions.map(session => session.userAgent));

    const ipAddress = req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Check if it's a new device (new IP or user-agent)
    const isNewDevice = !previousIPs.has(ipAddress) || !previousUserAgents.has(userAgent);

    // Log the new login session
    await ActivityLog.create({
      userId: existingUser._id,
      email: existingUser.email,
      ipAddress: req.ip || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      action: 'LOGIN',
    });
    await evaluateAndAssignBadges(existingUser._id);

    // Send alert if more than one active session is found
    if (activeSessions.length > 1) {
      await transport2.sendMail({
        from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS_2,
        to: existingUser.email,
        subject: 'Alerte de Connexion Inhabituelle',
        html: `<p>Nous avons détecté une connexion inhabituelle à votre compte depuis une nouvelle localisation/IP.</p>
               <p>Si ce n'était pas vous, veuillez changer immédiatement votre mot de passe.</p>`,
      });
    }

    // Return success response with the token
    return res
      .cookie('Authorization', 'Bearer ' + token, {
        expires: new Date(Date.now() + 8 * 3600000),
        httpOnly: process.env.NODE_ENV === 'production',
        secure: process.env.NODE_ENV === 'production',
      })
      .status(200)
      .json({
        success: true,
        token,
        message: 'Logged in successfully',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          role: existingUser.role,
        },
      });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.',
    });
  }
};


// exports.signout = async (req, res) => {
//   try {
//     let user = req.user;

//     // 1. Récupérer le token depuis les cookies si req.user est manquant
//     if (!user && req.cookies?.token) {
//       try {
//         const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
//         user = await User.findById(decoded.id);
//       } catch (err) {
//         console.error("Erreur lors du décodage du token:", err);
//       }
//     }

//     // 2. Enregistrer l’activité LOGOUT si utilisateur trouvé
//     if (user) {
//       const lastLogin = await ActivityLog.findOne({
//         userId: user._id,
//         action: 'LOGIN',
//       }).sort({ createdAt: -1 });

//       const duration = lastLogin
//         ? Date.now() - lastLogin.createdAt.getTime()
//         : null;

//       try {
//         await ActivityLog.create({
//           userId: user._id,
//           email: user.email,
//           action: 'LOGOUT',
//           ipAddress: req.ip || 'Unknown',
//           userAgent: req.headers['user-agent'] || 'Unknown',
//           duration,
//         });
//         console.log("Activité LOGOUT enregistrée");
//       } catch (err) {
//         console.error("Erreur enregistrement LOGOUT:", err);
//       }
//     } else {
//       console.warn("Utilisateur non identifié lors du logout");
//     }

//     // 3. Supprimer le cookie
//     res.clearCookie('token', {
//       httpOnly: true,
//       sameSite: 'strict',
//       secure: process.env.NODE_ENV === 'production',
//     });

//     // 4. Répondre au client
//     res.status(200).json({ success: true, message: "Déconnexion réussie" });
//   } catch (error) {
//     console.error("Erreur dans signout:", error);
//     res.status(500).json({ success: false, message: "Erreur serveur" });
//   }
// };


exports.signout = async (req, res) => {
  try {
    // 1. Debug : Afficher l'en-tête Authorization
    console.log("Authorization header:", req.headers.authorization);

    let user = null;

    // 2. Récupération et décodage du token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

        console.log("Token décodé:", decoded);
        user = await User.findById(decoded.userId);
        console.log("Utilisateur trouvé:", user?.email);
      } catch (err) {
        console.error("Erreur de vérification du token:", err.message);
      }
    } else {
      console.warn("Aucun token trouvé dans l'en-tête Authorization.");
    }

    // 3. Enregistrement de l'activité LOGOUT
    if (user) {
      const lastLogin = await ActivityLog.findOne({
        userId: user._id,
        action: 'LOGIN',
      }).sort({ createdAt: -1 });

      const duration = lastLogin
        ? Date.now() - lastLogin.createdAt.getTime()
        : null;

      await ActivityLog.create({
        userId: user._id,
        email: user.email,
        action: 'LOGOUT',
        ipAddress: req.ip || 'Unknown',
        userAgent: req.headers['user-agent'] || 'Unknown',
        duration,
      });
      await evaluateAndAssignBadges(user._id);

      console.log("Activité LOGOUT enregistrée.");
    } else {
      console.warn("Impossible d’enregistrer LOGOUT : utilisateur non trouvé.");
    }

    res.status(200).json({ success: true, message: "Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur dans signout:", error.message);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};



exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password -verificationCode -forgotPasswordCode');
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully!',
      users: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving users.',
    });
  }
};

// Stratégie Facebook pour l'authentification



exports.studentInfo = async (req, res) => {
  try {
    const { identifier, situation, disease, socialCase } = req.body;
    const userId = req.user.id; // Supposons que l'utilisateur est authentifié

    // Mettez à jour l'utilisateur avec les informations de l'étudiant
    await User.findByIdAndUpdate(userId, {
      studentInfo: { identifier, situation, disease, socialCase },
    });

    res.status(200).json({ success: true, message: "Student information saved successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.teacherInfo = async (req, res) => {
  try {
    const { number, bio, cv, diploma, experience, cin } = req.body;
    const userId = req.user.id; // Supposons que l'utilisateur est authentifié

    // Mettez à jour l'utilisateur avec les informations de l'enseignant
    await User.findByIdAndUpdate(userId, {
      teacherInfo: { number, bio, cv, diploma, experience, cin },
    });

    res.status(200).json({ success: true, message: "Teacher information saved successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User does not exists!' });
    }
    if (existingUser.verified) {
      return res.status(400).json({ success: false, message: 'You are already verified!' });
    }

    const codeValue = Math.floor(Math.random() * 1000000).toString();
    let info = await transport.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      to: existingUser.email,
      subject: 'verification code',
      html: '<h1>' + codeValue + '</h1>',
    });

    if (info.accepted[0] === existingUser.email) {
      const hashedCodeValue = hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      existingUser.verificationCode = hashedCodeValue;
      existingUser.verificationCodeValidation = Date.now();
      await existingUser.save();
      return res.status(200).json({ success: true, message: 'Code sent!' });
    }
    res.status(400).json({ success: false, message: 'Code sent failed!' });
  } catch (error) {
    console.log(error);
  }
};

exports.verifyVerificationCode = async (req, res) => {
  const { email, providedCode } = req.body;
  try {
    const { error, value } = acceptCodeSchema.validate({ email, providedCode });
    if (error) {
      return res.status(401).json({ success: false, message: error.details[0].message });
    }

    const codeValue = providedCode.toString();
    const existingUser = await User.findOne({ email }).select(
      '+verificationCode +verificationCodeValidation'
    );

    if (!existingUser) {
      return res.status(401).json({ success: false, message: 'User does not exists!' });
    }
    if (existingUser.verified) {
      return res.status(400).json({ success: false, message: 'you are already verified!' });
    }

    if (
      !existingUser.verificationCode ||
      !existingUser.verificationCodeValidation
    ) {
      return res.status(400).json({ success: false, message: 'something is wrong with the code!' });
    }

    if (Date.now() - existingUser.verificationCodeValidation > 5 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'code has been expired!' });
    }

    const hashedCodeValue = hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );

    if (hashedCodeValue === existingUser.verificationCode) {
      existingUser.verified = true;
      existingUser.verificationCode = undefined;
      existingUser.verificationCodeValidation = undefined;
      await existingUser.save();
      return res.status(200).json({ success: true, message: 'your account has been verified!' });
    }
    return res.status(400).json({ success: false, message: 'unexpected occured!!' });
  } catch (error) {
    console.log(error);
  }
};

exports.changePassword = async (req, res) => {
  const { userId, verified } = req.user;
  const { oldPassword, newPassword } = req.body;
  try {
    const { error, value } = changePasswordSchema.validate({
      oldPassword,
      newPassword,
    });
    if (error) {
      return res.status(401).json({ success: false, message: error.details[0].message });
    }
    if (!verified) {
      return res.status(401).json({ success: false, message: 'You are not verified user!' });
    }
    const existingUser = await User.findOne({ _id: userId }).select(
      '+password'
    );
    if (!existingUser) {
      return res.status(401).json({ success: false, message: 'User does not exists!' });
    }
    const result = await doHashValidation(oldPassword, existingUser.password);
    if (!result) {
      return res.status(401).json({ success: false, message: 'Invalid credentials!' });
    }
    const hashedPassword = await doHash(newPassword, 12);
    existingUser.password = hashedPassword;
    await existingUser.save();
    return res.status(200).json({ success: true, message: 'Password updated!!' });
  } catch (error) {
    console.log(error);
  }
};

exports.sendForgotPasswordCode = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User does not exists!' });
    }

    const codeValue = Math.floor(Math.random() * 1000000).toString();
    let info = await transport.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      to: existingUser.email,
      subject: 'Forgot password code',
      html: '<h1>' + codeValue + '</h1>',
    });

    if (info.accepted[0] === existingUser.email) {
      const hashedCodeValue = hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      existingUser.forgotPasswordCode = hashedCodeValue;
      existingUser.forgotPasswordCodeValidation = Date.now();
      await existingUser.save();
      return res.status(200).json({ success: true, message: 'Code sent!' });
    }
    res.status(400).json({ success: false, message: 'Code sent failed!' });
  } catch (error) {
    console.log(error);
  }
};

exports.verifyForgotPasswordCode = async (req, res) => {
  const { email, providedCode, newPassword } = req.body;
  try {
    const { error, value } = acceptFPCodeSchema.validate({
      email,
      providedCode,
      newPassword,
    });
    if (error) {
      return res.status(401).json({ success: false, message: error.details[0].message });
    }

    const codeValue = providedCode.toString();
    const existingUser = await User.findOne({ email }).select(
      '+forgotPasswordCode +forgotPasswordCodeValidation'
    );

    if (!existingUser) {
      return res.status(401).json({ success: false, message: 'User does not exists!' });
    }

    if (
      !existingUser.forgotPasswordCode ||
      !existingUser.forgotPasswordCodeValidation
    ) {
      return res.status(400).json({ success: false, message: 'something is wrong with the code!' });
    }

    if (
      Date.now() - existingUser.forgotPasswordCodeValidation >
      5 * 60 * 1000
    ) {
      return res.status(400).json({ success: false, message: 'code has been expired!' });
    }

    const hashedCodeValue = hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );

    if (hashedCodeValue === existingUser.forgotPasswordCode) {
      const hashedPassword = await doHash(newPassword, 12);
      existingUser.password = hashedPassword;
      existingUser.forgotPasswordCode = undefined;
      existingUser.forgotPasswordCodeValidation = undefined;
      await existingUser.save();
      return res.status(200).json({ success: true, message: 'Password updated!!' });
    }
    return res.status(400).json({ success: false, message: 'unexpected occured!!' });
  } catch (error) {
    console.log(error);
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password -verificationCode -forgotPasswordCode');
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully!',
      users: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving users.',
    });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    // Récupérer tous les utilisateurs
    const users = await User.find({}).select('-password -verificationCode -forgotPasswordCode');

    // Tableau pour stocker les logs avec la durée de session
    const logsWithDuration = [];

    // Parcourir chaque utilisateur
    for (const user of users) {
      // Récupérer tous les logs de l'utilisateur (LOGIN et LOGOUT)
      const logs = await ActivityLog.find({
        userId: user._id,
        action: { $in: ['LOGIN',
        'LOGOUT',
        'PASSWORD_CHANGE',
        'SIGNUP',
        'CHECK_MODULE',
        'CHECK_LESSON',
		'LESSON_COMPLETED',
        'WATCH_MUSIC',
        'VIDEO_CALL',
        'START_EVALUATION',
        'SUBMIT_EVALUATION',
        'CHECK_LESSON_DURATION',
		'FORUM',
		'REPLY_FORUM'] },
      }).sort({ createdAt: 1 }); // Trier par date croissante

      let totalDuration = 0;
      let lastLogin = null;

      // Calculer la durée totale de session pour cet utilisateur
      for (const log of logs) {
        if (log.action === 'LOGIN') {
          lastLogin = log;
        } else if (log.action === 'LOGOUT' && lastLogin) {
          const duration = log.createdAt - lastLogin.createdAt;
          totalDuration += duration;
          lastLogin = null;
        }
      }

      // Si une session est toujours active (pas de LOGOUT), ajouter la durée jusqu'à maintenant
      if (lastLogin) {
        const duration = Date.now() - lastLogin.createdAt.getTime();
        totalDuration += duration;
      }

      // Convertir la durée en un format lisible (heures, minutes, secondes)
      const millisecondsToTime = (duration) => {
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / (1000 * 60)) % 60);
        const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

        return `${hours}h ${minutes}m ${seconds}s`;
      };

      const formattedDuration = millisecondsToTime(totalDuration);

      // Ajouter les logs de l'utilisateur avec la durée de session
      logsWithDuration.push({
        userId: user._id,
        firstName: user.firstName,
        email: user.email,
        totalDuration: formattedDuration,
        logs: logs, // Inclure tous les logs de l'utilisateur
      });
    }

    res.status(200).json({
      success: true,
      logs: logsWithDuration,
      message: 'Logs retrieved successfully with session duration!',
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getUserSessionDuration = async (req, res) => {
  try {
   

    const userId = req.user.userId;

    // Récupérer toutes les actions LOGIN et LOGOUT de cet utilisateur
    const logs = await ActivityLog.find({
      userId,
      action: { $in: ['LOGIN', 'LOGOUT'] },
    }).sort({ createdAt: 1 }); // Trier par date croissante

    let totalDuration = 0;
    let lastLogin = null;

    // Parcourir les logs pour calculer la durée totale
    for (const log of logs) {
      if (log.action === 'LOGIN') {
        lastLogin = log;
      } else if (log.action === 'LOGOUT' && lastLogin) {
        const duration = log.createdAt - lastLogin.createdAt;
        totalDuration += duration;
        lastLogin = null;
      }
    }

    // Si une session est toujours active (pas de LOGOUT), ajouter la durée jusqu'à maintenant
    if (lastLogin) {
      const duration = Date.now() - lastLogin.createdAt.getTime();
      totalDuration += duration;
    }

    const millisecondsToTime = (duration) => {
      const seconds = Math.floor((duration / 1000) % 60);
      const minutes = Math.floor((duration / (1000 * 60)) % 60);
      const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    
      return `${hours}h ${minutes}m ${seconds}s`;
    };
    
    const formattedDuration = millisecondsToTime(totalDuration);

    res.status(200).json({
      success: true,
      email: req.user.email, // Ajoutez cette ligne
      totalDuration: formattedDuration, // Durée en millisecondes
      message: 'Total session duration retrieved successfully!',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while retrieving session duration.' });
  }
 


};
 exports.getUserActionStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    console.log("User ID:", userId);
    
    const results = await ActivityLog.aggregate([
        { $match: { userId: userId } }, 
      {
        $group: {
          _id: {
            userId: "$userId",
            action: "$action"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.userId",
          actions: {
            $push: {
              action: "$_id.action",
              count: "$count"
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          email: "$user.email",
          actions: 1
        }
      },
      {
        $sort: { email: 1 }
      }
    ]);
    console.log("User action stats:", results);

    res.status(200).json(results);
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ error: "Failed to get user action stats" });
  }
};