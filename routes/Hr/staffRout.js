const express = require("express");

const authService = require("../../services/authService");
const {
  getStaff,
  createStaff,
  getOneStaff,
  updataStaff,
  deleteStaff,
  resizeAndSaveFiles,
  uploadImageAndFiles,
} = require("../../services/Hr/staffServices");

const staffRout = express.Router();

staffRout
  .route("/")
  .get(getStaff)
  .post(uploadImageAndFiles, resizeAndSaveFiles, createStaff);
staffRout
  .route("/:id")
  .get(getOneStaff)
  .put(uploadImageAndFiles, resizeAndSaveFiles, updataStaff)
  .delete(deleteStaff);

module.exports = staffRout;
