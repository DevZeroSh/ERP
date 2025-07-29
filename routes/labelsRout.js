const express = require("express");
const {
  getLabels,
  createLabel,
  getLabel,
  updataLabel,
  deleteLabel,
} = require("../services/labelsServices");

const authService = require("../services/authService");
const LabelRout = express.Router();
// authService.allowedTo("label"),
  LabelRout.route("/")
    .get(getLabels)
    .post(authService.protect,createLabel);

LabelRout.route("/:id")
  .get(getLabel)
  .put(authService.protect,updataLabel)
  .delete(authService.protect,deleteLabel);

module.exports = LabelRout;
