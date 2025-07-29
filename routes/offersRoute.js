const express = require("express");
const mongoose = require("mongoose");
const {
  createOffer,
  getOffer,
  getOneOffer,
  updateOffer,
  deleteOffer,
  uploadOfferImages,
  resizeOfferImages,
  getOneOfferByProduct,
} = require("../services/offerServices");

const offersRouter = express.Router();

offersRouter
  .route("/")
  .get(getOffer)
  .post(uploadOfferImages, resizeOfferImages, createOffer);
offersRouter.route("/winoffer/:id").get(getOneOfferByProduct);
offersRouter
  .route("/:id")
  .get(getOneOffer)
  .put(updateOffer)
  .delete(deleteOffer);

module.exports = offersRouter;
