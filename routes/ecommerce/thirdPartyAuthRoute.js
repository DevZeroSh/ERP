const express = require("express");
const {
  getAuths,
  getThirdPartyAuth,
  updateThirdPartyAuth,
} = require("../../services/ecommerce/thirdPartyAuthService");

const thirdPartyRoute = express.Router();

thirdPartyRoute.route("/").get(getAuths);

thirdPartyRoute.route("/:id").get(getThirdPartyAuth).put(updateThirdPartyAuth);

module.exports = thirdPartyRoute;
