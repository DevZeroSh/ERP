const express = require("express");

const {
  getReviews,
  createReview,
  getOneReview,
  updateReview,
  deleteReview,
  getReviewsByProduct,
  getOneReviewByUser,
} = require("../../services/ecommerce/reviewService");
const authService = require("../../services/authService");

const reviewRout = express.Router();

reviewRout.route("/").get(getReviews).post(createReview);
reviewRout.route("/reviewproduct/:id").get(getReviewsByProduct);
reviewRout
  .route("/reviewProductForUser/:productId")
  .get(authService.ecommerceProtect, getOneReviewByUser);

reviewRout
  .route("/:id")
  .get(getOneReview)
  .put(updateReview)
  .delete(deleteReview);

module.exports = reviewRout;
