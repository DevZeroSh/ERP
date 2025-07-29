const express = require("express");
const {
  createAsset,
  deleteAsset,
  getAsset,
  getAssets,
  updateAsset,
} = require("../services/assetCardService");
const authService = require("../services/authService");

const AssetCardRoute = express.Router();
AssetCardRoute.use(authService.protect);

AssetCardRoute.route("/").post(createAsset).get(getAssets);
AssetCardRoute.route("/:id").put(updateAsset).get(getAsset).delete(deleteAsset);

module.exports = AssetCardRoute;
