const express = require("express");
const {
  createCompanyInfo,
  uploadCompanyLogo,
  resizerLogo,
  getCompanyInfo,
  updataCompanyInfo,
} = require("../services/companyInfoService");

const authService = require("../services/authService");

const companyInfoRoute = express.Router();

companyInfoRoute
  .route("/")
  .post(uploadCompanyLogo, resizerLogo, createCompanyInfo)
  .get(getCompanyInfo);
companyInfoRoute
  .route("/:id")
  .put(
    authService.protect,
    authService.protect,
    uploadCompanyLogo,
    resizerLogo,
    updataCompanyInfo
  );

module.exports = companyInfoRoute;
