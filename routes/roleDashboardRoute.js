const express = require("express");

const {getRoleDashboard} = require("../services/roleDashboardServices");

const RoleDashboardRoute = express.Router();

RoleDashboardRoute.route("/").get(getRoleDashboard);

module.exports = RoleDashboardRoute;