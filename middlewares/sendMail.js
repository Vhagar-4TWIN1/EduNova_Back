const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
		pass: process.env.NODE_CODE_SENDING_EMAIL_PASSWORD,
<<<<<<< HEAD
		
	},
});

const transport2 = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS_2,
		pass: process.env.NODE_CODE_SENDING_EMAIL_PASSWORD_2,
	},
});



module.exports = {transport,transport2};
=======
	},
});

module.exports = transport;
>>>>>>> user-crud
