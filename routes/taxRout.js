const express = require("express");
const {
  getTax,
  createTax,
  getOneTax,
  updataTax,
  deleteTax,
} = require("../services/taxServices");

const authService = require("../services/authService");
const taxRout = express.Router();


taxRout.route("/").get(getTax).post(authService.protect,createTax);
taxRout.route("/:id").get(getOneTax).put(authService.protect,updataTax).delete(authService.protect,deleteTax);

module.exports = taxRout;
