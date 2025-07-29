const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const {
  createCustomar,
  getCustomars,
  getCustomar,
  updataCustomar,
  deleteCustomar,
  updateCustomerPassword,
  importCustomer,
} = require("../services/customarServices");
const multer = require("multer");
const upload = multer();
router.route("/e-edit/:id").put(authService.ecommerceProtect, updataCustomar);
router
  .route("/updatePassword")
  .put(authService.ecommerceProtect, updateCustomerPassword);
router
  .route("/")
  .post(authService.protect, createCustomar)
  .get(authService.protect, getCustomars);
router
  .route("/:id")
  .get(authService.protect, getCustomar)
  .put(authService.protect, updataCustomar)
  .delete(authService.protect, deleteCustomar);


module.exports = router;
