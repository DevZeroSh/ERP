const express = require("express");
const {
  uploadSliderImages,
  resizeSliderImages,
  getSlider,
  updataSlider,
  getPage,
  updatePage,
  getContactUs,
  updateContactUs,
  getOnePage,
} = require("../../services/ecommerce/ecommerceSettingsService");
const authService = require("../../services/authService");

const ecommerceSettingsRoute = express.Router();

ecommerceSettingsRoute.route("/page").get(getPage);
ecommerceSettingsRoute.route("/slider").get(getSlider);
ecommerceSettingsRoute.route("/contactUs").get(getContactUs);

ecommerceSettingsRoute
  .route("/page/:id")
  .get(getOnePage)
  .put(authService.protect, updatePage);
ecommerceSettingsRoute
  .route("/slider/:id")
  .put(
    authService.protect,
    uploadSliderImages,
    resizeSliderImages,
    updataSlider
  );
ecommerceSettingsRoute
  .route("/contactUs")
  .put(authService.protect, updateContactUs);

module.exports = ecommerceSettingsRoute;
