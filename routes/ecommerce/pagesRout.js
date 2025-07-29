const express = require("express");
const {
  getPage,
  createPage,
  updatePage,
  getOnePage,
} = require("../../services/ecommerce/pageService");

const pagesRout = express.Router();
const authService = require("../../services/authService");

pagesRout.route("/").post(authService.protect, createPage).get(getPage);
pagesRout.route("/:id").get(getOnePage).put(authService.protect, updatePage);

module.exports = pagesRout;
