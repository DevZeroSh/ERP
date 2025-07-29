const express = require("express");

const authService = require("../services/authService");
const {
  createLinkPanel,
  getAllLinkPanel,
  updateLinkPanel,
  getLinkPanel,
} = require("../services/LinkPanelServices");

const linkPanelRoute = express.Router();

linkPanelRoute.use(authService.protect);

linkPanelRoute.route("/").get(getAllLinkPanel).post(createLinkPanel);
linkPanelRoute.route("/:id").get(getLinkPanel).put(updateLinkPanel);
module.exports = linkPanelRoute;
