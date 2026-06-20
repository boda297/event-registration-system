const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", protect, adminOnly, userController.getAllUsers);
router.get("/:id", protect, adminOnly, userController.getUserById);
router.post("/", protect, adminOnly, userController.createAdminUser);
router.put("/:id", protect, adminOnly, userController.updateUser);
router.delete("/:id", protect, adminOnly, userController.deleteUser);

module.exports = router;
