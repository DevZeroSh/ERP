const express = require("express");

const authService = require("../services/authService");
const {
  getStocks,
  createStock,
  getOneStock,
  updateStock,
  deleteStock,
  transformQuantity,
  getTransferStock,
  getOneTransferStock,
  getTransferForStock,
  getAllStatementStock,
} = require("../services/stockService");

const stockRout = express.Router();

stockRout.route("/").get(getStocks).post(authService.protect, createStock);
stockRout
  .route("/transfer").get(getTransferStock).put(authService.protect, transformQuantity);
stockRout
  .route("/transfer/:id").get(getOneTransferStock)
stockRout
  .route("/transferforstock/:id").get(getTransferForStock)
stockRout.route("/transferallstatementstock").get(getAllStatementStock)
stockRout
  .route("/:id")
  .get(getOneStock)
  .put(authService.protect, updateStock)
  .delete(authService.protect, deleteStock);

module.exports = stockRout;
