const express = require("express");

const reportsFinancialFundRoute = express.Router();

const authService = require("../services/authService");
const {
  getReportsFinancialFunds,
  getSpecificReports,
} = require("../services/reportsFinancialFundsService");

reportsFinancialFundRoute.use(authService.protect);

reportsFinancialFundRoute.route("/").get(getReportsFinancialFunds);
reportsFinancialFundRoute.route("/:id").get(getSpecificReports);

module.exports = reportsFinancialFundRoute;
