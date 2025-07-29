const express = require("express");
const {
  createFinalAsset,
  deleteFinalAsset,
  getFinalAsset,
  getFinalAssets,
  updateFinalAsset,
} = require("../services/finalAssetService");
const authService = require("../services/authService");

const finalAsset = express.Router();
finalAsset.use(authService.protect);

finalAsset.route("/").post(createFinalAsset).get(getFinalAssets);
finalAsset.route("/:id").get(getFinalAsset).put(updateFinalAsset).delete(deleteFinalAsset);

module.exports = finalAsset;
