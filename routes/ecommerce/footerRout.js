const express = require("express");

const footerRout = express.Router();
const authService = require("../../services/authService");
const {
  getFooters,
  addFooters,
  getFooter,
  updateFooter,
  deleteFooter,
} = require("../../services/ecommerce/footerService");

footerRout.route("/").post(authService.protect, addFooters).get(getFooters);
footerRout
  .route("/:id")
  .get(getFooter)
  .put(authService.protect, updateFooter)
  .delete(authService.protect, deleteFooter);

module.exports = footerRout;
