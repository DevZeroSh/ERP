const express = require("express");

const authService = require("../services/authService");
const {
  getAllProductsMovements,
  getProductMovementByID,
} = require("../services/productMovementServices");

const productMovementsRoute = express.Router();

productMovementsRoute.use(authService.protect);
productMovementsRoute.route("/").get(getAllProductsMovements);
productMovementsRoute.route("/:id").get(getProductMovementByID);

module.exports = productMovementsRoute;
