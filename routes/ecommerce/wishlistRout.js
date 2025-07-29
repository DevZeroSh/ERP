const express = require("express");

const authService = require("../../services/authService");
const {
  addProductToWishlist,
  getLoggedUserWishlist,
  removeProductFromWishlist,
} = require("../../services/ecommerce/wishlistService");

const wishlistRouter = express.Router();

wishlistRouter.use(authService.ecommerceProtect);

wishlistRouter.route("/").post(addProductToWishlist).get(getLoggedUserWishlist);

wishlistRouter.delete("/:productId", removeProductFromWishlist);

module.exports = wishlistRouter;
