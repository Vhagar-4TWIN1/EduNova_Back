const ActivityLog = require('../models/activityLog');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


const {
  signupSchema,
  signinSchema,
  acceptCodeSchema,
  changePasswordSchema,
  acceptFPCodeSchema,
} = require('../middlewares/validator');
const User = require('../models/usersModel');
const { doHash, doHashValidation, hmacProcess } = require('../utils/hashing');
const {transport , transport2} = require('../middlewares/sendMail');

// Sérialisation et désérialisation de l'utilisateur pour Passport



exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, age, email, password, country, photo } = req.body;
    const { error } = signupSchema.validate({ firstName, lastName, age, email, password, country, photo });

    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ firstName, lastName, age, email, password: hashedPassword, country, photo });

    res.status(201).json({
      success: true,
      message: 'User created successfully!',
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        age: newUser.age,
        email: newUser.email,
        country: newUser.country,
        photo: newUser.photo,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.signin = async (req, res) => {
	const { email, password } = req.body;
	try {
		const { error, value } = signinSchema.validate({ email, password });
		if (error) {
			return res
				.status(401)
				.json({ success: false, message: error.details[0].message });
		}

		const existingUser = await User.findOne({ email }).select('+password');
		if (!existingUser) {
			return res
				.status(401)
				.json({ success: false, message: 'User does not exists!' });
		}
		const result = await doHashValidation(password, existingUser.password);
		if (!result) {
			return res
				.status(401)
				.json({ success: false, message: 'Invalid credentials!' });
		}
		const token = jwt.sign(
			{
				userId: existingUser._id,
				email: existingUser.email,
				verified: existingUser.verified,
			},
			process.env.TOKEN_SECRET,
			{
				expiresIn: '8h',
			}
		);
		// Vérification des connexions actives dans les dernières 8 heures
const activeSessions = await ActivityLog.find({
  userId: existingUser._id,
  action: 'LOGIN',
  createdAt: { $gte: new Date(Date.now() - 8 * 3600000) }, // Dernières 8 heures
});

// Récupérer les IP et user-agents précédents
const previousIPs = new Set(activeSessions.map(session => session.ipAddress));
const previousUserAgents = new Set(activeSessions.map(session => session.userAgent));

const ipAddress = req.ip || 'Unknown';
const userAgent = req.headers['user-agent'] || 'Unknown';

// Vérifier si c'est une nouvelle machine (nouvelle IP ou nouvel user-agent)
const isNewDevice = !previousIPs.has(ipAddress) || !previousUserAgents.has(userAgent);

// Enregistrement de l'historique de connexion après la vérification
await ActivityLog.create({
  userId: existingUser._id,
  action: 'LOGIN',
  ipAddress,
  userAgent,
});

// Envoyer l'alerte uniquement si une nouvelle machine est détectée
if (isNewDevice && activeSessions.length > 0) {
  await transport2.sendMail({
    from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS_2,
    to: existingUser.email,
    subject: 'Alerte de Connexion Inhabituelle',
    html: `<p>Nous avons détecté une connexion inhabituelle à votre compte depuis une nouvelle localisation/IP.</p>
           <p>IP: ${ipAddress} | Appareil: ${userAgent}</p>
           <p>Si ce n'était pas vous, veuillez changer immédiatement votre mot de passe.</p>`,
  });
}

		

		res
			.cookie('Authorization', 'Bearer ' + token, {
				expires: new Date(Date.now() + 8 * 3600000),
				httpOnly: process.env.NODE_ENV === 'production',
				secure: process.env.NODE_ENV === 'production',
			})
			.json({
				success: true,
				token,
				message: 'logged in successfully',
			});
	} catch (error) {
		console.log(error);
	}
};
exports.signout = async (req, res) => {
  res
    .clearCookie('Authorization')
    .status(200)
    .json({ success: true, message: 'logged out successfully' });
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
		const filter = req.user ? { userId: req.user.userId } : {}; // Appliquer le filtre seulement si req.user existe
		const logs = await ActivityLog.find(filter).sort({ createdAt: -1 });

		res.status(200).json({ success: true, logs });
	} catch (error) {
		console.error('Erreur lors de la récupération des logs:', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};
