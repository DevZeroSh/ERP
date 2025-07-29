const express = require("express");

const authService = require("../../services/authService");
const {
  createFingerPrint,
  getFingerPrint,
  deleteFingerprint,
  updateFingerPrint,
  getOneFingerPrint,
  getLoggedUserFingerPrint,
} = require("../../services/Hr/fingerPrintServices");

const fingerPrintRout = express.Router();
fingerPrintRout.use(authService.protect);

fingerPrintRout.route("/loged").get(getLoggedUserFingerPrint)
fingerPrintRout.route("/").get(getFingerPrint).post(createFingerPrint);
fingerPrintRout
  .route("/:id")
  .get(getOneFingerPrint)
  .delete(deleteFingerprint)
  .put(updateFingerPrint);
module.exports = fingerPrintRout;
