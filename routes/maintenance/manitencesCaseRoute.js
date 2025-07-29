const express = require("express");

const authService = require("../../services/authService");
const {
  getManitenaceCase,
  createManitenaceCase,
  getOneManitenaceCase,
  updateManitenaceCase,
  deleteManitenaceCase,
  convertToSales,
  addProductInManitencesCase,
  getCaseByDeviceId,
  addCalling,
  getOneManitenaceCaseForUser,
} = require("../../services/maintenance/manitencesCaseService");

const manitCaseRout = express.Router();

manitCaseRout
  .route("/maintenancecase/:counter")
  .get(getOneManitenaceCaseForUser)
manitCaseRout.route("/").get(authService.protect,getManitenaceCase).post(authService.protect,createManitenaceCase);
manitCaseRout.route("/addproduct/:id").put(authService.protect,addProductInManitencesCase)
manitCaseRout.route("/addcalling/:id").put(authService.protect,addCalling)
manitCaseRout.route("/convert/:id").put(authService.protect,convertToSales)
manitCaseRout.route("/devicecases/:id").get(authService.protect,getCaseByDeviceId)

manitCaseRout
  .route("/:id")
  .get(getOneManitenaceCase)
  .put(authService.protect,updateManitenaceCase)
  .delete(authService.protect,deleteManitenaceCase);

module.exports = manitCaseRout;
