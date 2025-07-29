const express = require("express");

const authService = require("../../services/authService");
const {
  getManitenaceUser,
  updateManitenaceUser,
  getOneManitenaceUser,
  createManitenaceUser,
  deleteManitenaceUser,
  importClint,
} = require("../../services/maintenance/maintenanceUserService");
const { getDevicesByUserID } = require("../../services/maintenance/devicesService");

const manitUserRout = express.Router();
const multer = require("multer");
const upload = multer();
manitUserRout.route("/").get(getManitenaceUser).post(createManitenaceUser);
manitUserRout.route("/devices/:id").get(getDevicesByUserID)
manitUserRout.route("/test").post(upload.single("file"),importClint)

manitUserRout
  .route("/:id")
  .get(getOneManitenaceUser)
  .put(updateManitenaceUser)
  .delete(deleteManitenaceUser);

module.exports = manitUserRout;
