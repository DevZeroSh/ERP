const express = require("express");

const authService = require("../../services/authService");
const {
  getOneDevice,
  createDevice,
  getDevices,
  updateDevices,
  deleteDevice,
  importDevice,
} = require("../../services/maintenance/devicesService");
const multer = require("multer");
const upload = multer();

const devicesRout = express.Router();

devicesRout.route("/").get(getDevices).post(authService.protect, createDevice);
devicesRout.route("/test").post(upload.single("file"), importDevice);

devicesRout
  .route("/:id")
  .get(getOneDevice)
  .put(authService.protect, updateDevices)
  .delete(authService.protect, deleteDevice);

module.exports = devicesRout;
