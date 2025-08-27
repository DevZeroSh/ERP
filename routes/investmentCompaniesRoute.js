const express = require("express");
const {
  createInvestmentCompanies,
  getAllInvestmentCompaniess,
  getOneInvestmentCompanies,
  updateInvestmentCompanies,
  deleteInvestmentCompanies,
  resizeInvestmentCompaniesImages,
  uploadInvestmentCompaniesImage,
} = require("../services/investmentCompaniesService");
const authService = require("../services/authService");

const investmentCompaniesRoute = express.Router();
investmentCompaniesRoute.use(authService.protect);

investmentCompaniesRoute
  .route("/")
  .post(
    uploadInvestmentCompaniesImage,
    resizeInvestmentCompaniesImages,
    createInvestmentCompanies
  )
  .get(getAllInvestmentCompaniess);
investmentCompaniesRoute
  .route("/:id")
  .put(
    uploadInvestmentCompaniesImage,
    resizeInvestmentCompaniesImages,
    updateInvestmentCompanies
  )
  .get(getOneInvestmentCompanies)
  .delete(deleteInvestmentCompanies);

module.exports = investmentCompaniesRoute;
