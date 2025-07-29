const express = require("express");

const authService = require("../../services/authService");
const {
  addAddress,
  getLoggedUserAddresses,
  removeAddress,
  updateAddress,
  getAddressById,
} = require("../../services/ecommerce/addressService");

const addressRout = express.Router();

addressRout.use(authService.ecommerceProtect);

addressRout.route("/").post(addAddress).get(getLoggedUserAddresses);

addressRout
  .route("/:addressId")
  .put(updateAddress)
  .delete(removeAddress)
  .get(getAddressById);

module.exports = addressRout;
