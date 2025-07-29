const express = require("express");
const multer = require("multer");

const upload = multer();
const {
  login,
  signup,
  forgotPassword,
  verifyPasswordResetCode,
  resetPassword,
  EcommerceLogin,
  forgotPasswordPos,
  resetPasswordPos,
  verifyPasswordResetCodePos,
  googleLogin,
  facebookLogin,
} = require("../services/authService");
const { checkUserSubsicreber } = require("../middlewares/checkUserSubsicreber");

const router = express.Router();

router.post("/check", checkUserSubsicreber);
router.post("/login", upload.none(), login);
router.post(
  "/forgotpasswordspos",
  upload.none(),
  checkUserSubsicreber,
  forgotPasswordPos
);
router.post("/verifyresetcodepos", verifyPasswordResetCodePos);
router.put(
  "/resetpasswordpos",
  upload.none(),
  checkUserSubsicreber,
  resetPasswordPos
);

router.post("/ecommerce-login", EcommerceLogin);
router.post("/google-signin", googleLogin);
router.post("/facebook-signin", facebookLogin);
router.post("/signup", signup);
router.post("/forgotPasswords", forgotPassword);
router.post("/verifyResetCode", verifyPasswordResetCode);
router.put("/resetPassword", upload.none(), resetPassword);

module.exports = router;
