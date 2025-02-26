// routers/userRouter.js
const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

// Middleware to verify token (identifier)
//const { identifier } = require('../middlewares/identification');

// Protect all routes below with the identifier middleware
//router.use(identifier);

// Read all users
router.get("/", getAllUsers);

// Read one user by ID
router.get("/:id", getUserById);

// Update user
router.patch("/:id", updateUser);

// Delete user
router.delete("/:id", deleteUser);

module.exports = router;
