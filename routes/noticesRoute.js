const express = require("express");
const { getNotices } = require("../services/noticesServices");
const authService = require("../services/authService");

const noticesRouter = express.Router();

noticesRouter.route("/").get(authService.protect, getNotices);

module.exports = noticesRouter;
