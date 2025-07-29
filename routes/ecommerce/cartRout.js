const express = require("express");
const {
  addProductToCart,
  getLoggedUserCart,
  removeSpecifcCartItem,
  clearCart,
  updateCartItemQuantity,
} = require("../../services/ecommerce/cartServices");
const authService = require("../../services/authService");
const { createCashOrder } = require("../../services/orderServices");

const cartRout = express.Router();
cartRout.use(authService.ecommerceProtect);

cartRout
  .route("/")
  .post(addProductToCart)
  .get(getLoggedUserCart)
  .delete(clearCart);

// cartRout.put("/applycoupon", applyeCoupon);
// cartRout.put("/disapplycoupon", clearCoupon);
cartRout
  .route("/:itemId")
  .put(updateCartItemQuantity)
  .delete(removeSpecifcCartItem);
module.exports = cartRout;
