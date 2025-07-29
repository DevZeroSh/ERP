const express = require("express");

const authService = require("../../services/authService");
const {
  getPaymentMethods,
  getPaymentMethod,
  updatePaymentMethod,
} = require("../../services/ecommerce/ecommercePaymentMethodService");

const ecommercePaymentMethodRoute = express.Router();

ecommercePaymentMethodRoute.route("/").get(getPaymentMethods);

ecommercePaymentMethodRoute
  .route("/:id")
  .get(getPaymentMethod)
  .put(authService.protect, updatePaymentMethod);

module.exports = ecommercePaymentMethodRoute;
