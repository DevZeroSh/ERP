const express = require("express");
const {
  getFinancialFunds,
  createFinancialFunds,
  getOneFinancialFund,
  deletefinancialFund,
  transfer,
  getFinancialFundForSalesPoint,
  updateFinancialFund,
} = require("../services/financialFundsService");

const authService = require("../services/authService");
const financialFundsRoute = express.Router();

financialFundsRoute.use(authService.protect);

financialFundsRoute
  .route("/")
  .get(getFinancialFunds)
  .post(createFinancialFunds);
financialFundsRoute
  .route("/:id")
  .get(getOneFinancialFund)
  .put(updateFinancialFund)
  .delete(deletefinancialFund);
financialFundsRoute.route("/pos/:id").get(getFinancialFundForSalesPoint);
financialFundsRoute.route("/trans/:id").put(transfer);

module.exports = financialFundsRoute;
