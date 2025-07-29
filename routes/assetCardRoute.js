const express = require("express");
const {
  createAsset,
  deleteAsset,
  getAsset,
  getAssets,
  updateAsset,
} = require("../services/assetCardService");
const authService = require("../services/authService");

const assetsRoute = express.Router();
assetsRoute.use(authService.protect);

assetsRoute.route("/").post(createAsset).get(getAssets);
assetsRoute.route("/:id").put(updateAsset).get(getAsset).delete(deleteAsset);

module.exports = assetsRoute;
