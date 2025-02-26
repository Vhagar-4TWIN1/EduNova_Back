require('dotenv').config();
console.log("MongoDB URI:", process.env.MONGODB_URI); // Debugging
console.log("Port:", process.env.PORT);

const axios=require('axios')
const path=require('path')
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const authRouter = require('./routers/authRouter');
const app = express();


app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('static'))

mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log('Connected to MongoDB');
	})
	.catch((error) => {
		console.error('MongoDB connection error:', error);
	});

app.use('/api/auth', authRouter);
app.get('/', (req, res) => {
	res.json({ message: 'Hello from the server' });
});
app.get('/oauth', (req, res) => {
	res.redirect(`https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}`)
});

app.get('/auth', ({ query: { code } }, res) => {
	const body = {
		client_id: process.env.CLIENT_ID,
		client_secret: process.env.CLIENT_SECRET,
		code
	};
	const opts = { headers: { accept: 'application/json' } };
	axios.post('https://github.com/login/oauth/access_token', body, opts)
		.then((_res) => _res.data.access_token)
		.then((token) => {
			res.redirect(`http://localhost:5173?token=${token}`); // Redirect to your React app
		})
		.catch(err => res.status(500).json({ error: err.message }));
});
app.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on port ${process.env.PORT || 3000}...`); // FIXED string interpolation
});