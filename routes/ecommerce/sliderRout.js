const express = require("express");

const authService = require("../../services/authService");
const {
  getSliders,
  uploadSliderImages,
  resizeSliderImages,
  createSlider,
  getOneSlider,
  deleteSlider,
  updataSlider,
} = require("../../services/ecommerce/sliderService");

const sliderRout = express.Router();

sliderRout
  .route("/")
  .get(getSliders)
  .post(
    authService.protect,
    uploadSliderImages,
    resizeSliderImages,
    createSlider
  );
sliderRout
  .route("/:id")
  .get(getOneSlider)
  .delete(authService.protect, deleteSlider)
  .put(
    authService.protect,
    uploadSliderImages,
    resizeSliderImages,
    updataSlider
  );

module.exports = sliderRout;
