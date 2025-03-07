const {User} = require('../models/usersModel');
const fs = require('fs');
const path = require('path');

// Get all users
 exports.getAllUsers = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1; 
		const limit = parseInt(req.query.limit) || 5; 
		const skip = (page - 1) * limit;

		// Fetch users with pagination
		const users = await User.find()
			.select('-password') 
			.skip(skip)
			.limit(limit);

		// Count total users for pagination
		const totalUsers = await User.countDocuments();

		const totalPages = Math.ceil(totalUsers / limit);

		// Respond with the paginated data
		res.status(200).json({
			users,
			totalPages,
			currentPage: page,
			totalUsers
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};


// Update user
exports.updateUser = async (req, res) => {
	const { id } = req.params;
	const updateData = req.body;

	try {
		// If there's a new photo and an old one exists, delete the old photo
		if (updateData.photo) {
			const currentUser = await User.findById(id);
			if (currentUser && currentUser.photo && currentUser.photo !== updateData.photo) {
				try {
					const oldPhotoPath = path.join(__dirname, '..', currentUser.photo);
					if (fs.existsSync(oldPhotoPath)) {
						fs.unlinkSync(oldPhotoPath);
						console.log(`Old profile image deleted: ${oldPhotoPath}`);
					}
				} catch (err) {
					console.error('Error deleting old profile image:', err);
					// Continue with the update even if deleting fails
				}
			}
		}

		const updatedUser = await User.findByIdAndUpdate(id, updateData, { 
			new: true, 
			runValidators: true 
		}).select('-password');
		
		if (!updatedUser) {
			return res.status(404).json({ message: 'User not found' });
		}

		res.status(200).json(updatedUser);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

exports.getUserById = async (req, res) => {
	const { id } = req.params;
	try {
		const user = await User.findById(id).select('-password');
		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found!' });
		}
		res.status(200).json({ success: true, data: user });
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ success: false, message: 'An error occurred while fetching the user.' });
	}
};

// Delete user
 exports.deleteUser = async (req, res) => {
	const { id } = req.params;

	try {
		const user = await User.findById(id);
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}

		// Delete user's profile photo if it exists
		if (user.photo) {
			try {
				const photoPath = path.join(__dirname, '..', user.photo);
				if (fs.existsSync(photoPath)) {
					fs.unlinkSync(photoPath);
					console.log(`Profile image deleted: ${photoPath}`);
				}
			} catch (err) {
				console.error('Error deleting profile image:', err);
				// Continue with deletion even if image deletion fails
			}
		}
		
		const deletedUser = await User.findByIdAndDelete(id);
		res.status(200).json({ message: 'User deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};


