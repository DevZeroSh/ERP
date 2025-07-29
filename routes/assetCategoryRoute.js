const express = require("express");
const {
  createAssetCategory,
  getAssetCategory,
  getAssetsCategory,
} = require("../services/assetCategoryService");
const authService = require("../services/authService");

const assetCategoryRoute = express.Router();
assetCategoryRoute.use(authService.protect);

assetCategoryRoute.route("/").post(createAssetCategory).get(getAssetsCategory);
assetCategoryRoute.route("/:id").get(getAssetCategory);

module.exports = assetCategoryRoute;
