const express = require("express");
const authService = require("../../services/authService");
const {
  getSalaryHistories,
  createOneSalaryHistory,
  getOneSalaryHistory,
  updateOneSalaryHistory,
  createSalaryHistories,
  getSalaryisHistoryForStaff,
  paidSalaryOneStaff,
  paidSalaryForAllStaff,
  unpaidSalaryForAllStaff,
} = require("../../services/Hr/salaryHistory");

const salaryHistoryRoute = express.Router();

salaryHistoryRoute
  .route("/")
  .get(getSalaryHistories)
  .post(createOneSalaryHistory);

salaryHistoryRoute.route("/all-staff").post(createSalaryHistories);
salaryHistoryRoute
  .route("/unpaidsalary")
  .get(unpaidSalaryForAllStaff)
  .post(paidSalaryForAllStaff);
salaryHistoryRoute.route("/salay/:id").get(getSalaryisHistoryForStaff);

salaryHistoryRoute.route("/paid/:id").put(paidSalaryOneStaff);
salaryHistoryRoute
  .route("/:id")
  .get(getOneSalaryHistory)
  .put(updateOneSalaryHistory);

module.exports = salaryHistoryRoute;
