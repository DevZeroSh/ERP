const express = require("express");
const {
  getAllRawMaterials,
  getOneRawMaterial,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} = require("../services/resturant_management/rawMaterialsServices");

const authService = require("../services/authService");

const rawMaterialRoute = express.Router();

rawMaterialRoute
  .route("/")
  .get(getAllRawMaterials)
  .post(authService.protect, createRawMaterial);
brandRout
  .route("/:id")
  .get(getOneRawMaterial)
  .put(authService.protect, updateRawMaterial)
  .delete(authService.protect, deleteRawMaterial);

module.exports = rawMaterialRoute;
