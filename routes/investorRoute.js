const express = require("express");
const {
  createInvestor,
  getAllInvestors,
  getOneInvestor,
  updateInvestor,
  deleteInvestor,
  resizeInvestorImages,
  uploadInvestorImages,
} = require("../services/investorService");
const authService = require("../services/authService");

const investorRoute = express.Router();
investorRoute.use(authService.protect);

investorRoute
  .route("/")
  .post(uploadInvestorImages, resizeInvestorImages, createInvestor)
  .get(getAllInvestors);
investorRoute
  .route("/:id")
  .put(uploadInvestorImages, resizeInvestorImages, updateInvestor)
  .get(getOneInvestor)
  .delete(deleteInvestor);

module.exports = investorRoute;
