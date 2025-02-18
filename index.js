require('dotenv').config();
console.log("MongoDB URI:", process.env.MONGODB_URI); // Debugging
console.log("Port:", process.env.PORT);

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

app.listen(process.env.PORT || 3000, () => {
	console.log(`Listening on port ${process.env.PORT || 3000}...`); // FIXED string interpolation
});