const express = require("express");
const {
  getCurrencies,
  createCurrency,
  getCurrency,
  deleteCurrency,
  updataCurrency,
} = require("../services/currencyService");

const authService = require("../services/authService");

const currencyRoute = express.Router();



currencyRoute.route("/").get(getCurrencies).post(authService.protect,createCurrency);
currencyRoute
  .route("/:id")
  .get(getCurrency)
  .put(authService.protect,updataCurrency)
  .delete(authService.protect,deleteCurrency);

module.exports = currencyRoute;
