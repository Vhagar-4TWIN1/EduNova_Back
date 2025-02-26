const User = require('../models/usersModel');

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

	try {
		const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).select('-password');
		
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

/**
 * UPDATE USER
 * Update user information (excluding password changes, which is handled separately)
 */
exports.updateUser = async (req, res) => {
	const { id } = req.params;
	// We assume the body contains the updatable fields, e.g. "verified", or perhaps "email"
	const updates = req.body;

	try {
		// If password is included, you might decide to ignore or handle it here.
		// For security, let's remove 'password' from updates if present:
		if (updates.password) {
			delete updates.password;
		}

		const updatedUser = await User.findByIdAndUpdate(id, updates, {
			new: true,
			runValidators: true,
		}).select('-password');

		if (!updatedUser) {
			return res.status(404).json({ success: false, message: 'User not found!' });
		}

		res.status(200).json({
			success: true,
			message: 'User updated successfully!',
			data: updatedUser,
		});
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ success: false, message: 'An error occurred while updating the user.' });
	}
};

/**
 * DELETE USER
 * Remove a user from the database
 */
exports.deleteUser = async (req, res) => {
	const { id } = req.params;
	try {
		const deletedUser = await User.findByIdAndDelete(id);
		if (!deletedUser) {
			return res.status(404).json({ success: false, message: 'User not found!' });
		}
		res.status(200).json({
			success: true,
			message: 'User deleted successfully!',
			data: deletedUser,
		});
	} catch (error) {
		console.error(error);
		res
			.status(500)
			.json({ success: false, message: 'An error occurred while deleting the user.' });
	}
};
