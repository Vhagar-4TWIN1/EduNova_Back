"use strict";

const express = require("express");
const router = express.Router();
const {
  checkIP
} = require("../controllers/ipController");
router.get("/check-ip", checkIP);
module.exports = router;