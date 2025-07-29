const express = require("express");
const authService = require("../../services/authService");
const { createEFatura } = require("../../services/efatura/efaturaServices");

const efaturaRoute = express.Router();

efaturaRoute.route("/:type").post(authService.protect, createEFatura);

module.exports = efaturaRoute;
