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

const FingerPrintRout = express.Router();
FingerPrintRout.use(authService.protect);

FingerPrintRout.route("/loged").get(getLoggedUserFingerPrint)
FingerPrintRout.route("/").get(getFingerPrint).post(createFingerPrint);
FingerPrintRout
  .route("/:id")
  .get(getOneFingerPrint)
  .delete(deleteFingerprint)
  .put(updateFingerPrint);
module.exports = FingerPrintRout;
