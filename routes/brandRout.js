const express = require("express");
const {
  getBrands,
  createBrand,
  updataBrand,
  deleteBrand,
  getBrand,
  resizerBrandImage,
  uploadBrandImage,
} = require("../services/brandServices");
const {
  createBrandValidator,
  getBrandValidator,
  updataBrandValidator,
  deleteBrandValidator,
} = require("../utils/validators/brandValidator");

const authService = require("../services/authService");

const brandRout = express.Router();

brandRout
  .route("/")
  .get(getBrands)
  .post(
    authService.protect,
    uploadBrandImage,
    resizerBrandImage,
    createBrandValidator,
    createBrand
  );
brandRout
  .route("/:id")
  .get(getBrandValidator, getBrand)
  .put(
    authService.protect,
    uploadBrandImage,
    resizerBrandImage,
    updataBrandValidator,
    updataBrand
  )
  .delete(authService.protect, deleteBrandValidator, deleteBrand);

module.exports = brandRout;
