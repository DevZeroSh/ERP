const express = require("express");
const {
  createDiscount,
  getDiscounts,
  getOneDiscount,
  updateDiscount,
  deleteDiscount,
} = require("../services/discountService");
const authService = require("../services/authService");

const discountRoute = express.Router();

//prmisstions
discountRoute.use(authService.protect);

discountRoute.route("/").post(createDiscount).get(getDiscounts);

discountRoute
  .route("/:id")
  .get(getOneDiscount)
  .put(updateDiscount)
  .delete(deleteDiscount);

module.exports = discountRoute;
