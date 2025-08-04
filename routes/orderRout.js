const express = require("express");
const {
  findAllOrder,
  findOneOrder,
  returnOrder,
  getReturnOrder,
  getOneReturnOrder,
  DashBordSalse,
  editOrderInvoice,
  canceledOrder,
  findCustomer,
  mergeReceipts,
} = require("../services/orderServices");

const authService = require("../services/authService");

const OrderRout = express.Router();

OrderRout.route("/return").post(authService.protect, returnOrder);
OrderRout.route("/getReturnOrder").get(authService.protect, getReturnOrder);
OrderRout.route("/getReturnOrder/:id").get(
  authService.protect,
  getOneReturnOrder
);
OrderRout.route("/customerorder/:id").get(authService.protect, findCustomer);

OrderRout.route("/").get(authService.protect, findAllOrder);

OrderRout.route("/salesDashbord").post(authService.protect, DashBordSalse);
OrderRout.route("/merge").post(authService.protect, mergeReceipts);
OrderRout.route("/:id")
  .get(findOneOrder)
  .put(authService.protect, editOrderInvoice)
  .delete(authService.protect, canceledOrder);

module.exports = OrderRout;
