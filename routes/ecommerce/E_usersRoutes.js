const express = require("express");
const E_userRoute = express.Router();
const {
  createUser,
  getUsers,
  getOneUser,
  updateUser,
  deleteUser,
  updateUserPassword,
} = require("../../services/ecommerce/EcommerceUserServices");
const authService = require("../../services/authService");

E_userRoute.route("/").post(authService.protect,createUser).get(authService.protect,getUsers);
E_userRoute.route("/updatePassword").put(
  authService.ecommerceProtect,
  updateUserPassword
);
E_userRoute.route("/e-edit/:id").put(authService.ecommerceProtect, updateUser);
E_userRoute.route("/:id").get(authService.protect,getOneUser).put(authService.protect,updateUser).delete(authService.protect,deleteUser);
module.exports = E_userRoute;
