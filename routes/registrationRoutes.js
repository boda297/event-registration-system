const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const registrationController = require("../controllers/registrationController");

router.post("/:eventId", protect, registrationController.submitRegistration);

router.get("/me", protect, registrationController.getMyRegistrations);

router.delete("/:id", protect, registrationController.deleteMyRegistration);

module.exports = router;
