const express = require("express");

const authService = require("../services/authService");
const {
  findAllSalsePos,
  createCashOrder,
  findOneSalsePos,
  editPosOrder,
  returnPosSales,
  getReturnPosSales,
  getOneReturnPosSales,
  canceledPosSales,
  findAllSalsePosForSalsePoint,
  getReceiptForDate,
  mergeRefundReceipts,
  getRefundReceiptForDate,
} = require("../services/salesPosFishServices");

const SalesPosRout = express.Router();

SalesPosRout.use(authService.protect);

// Define more specific routes before general ones

// SalesPosRout.route("/salespos").get(findAllSalesPos);
SalesPosRout.route("/").get(findAllSalsePos).post(createCashOrder);
// SalesPosRout.route("/funds").post(createCashOrderMultipelFunds);
SalesPosRout.route("/salespoint/:id").get(findAllSalsePosForSalsePoint);
SalesPosRout.route("/refund_pos_receipt")
  .post(returnPosSales)
  .get(getReturnPosSales);
SalesPosRout.route("/merge").post(mergeRefundReceipts);

SalesPosRout.route("/refund_pos_receipt/:id").get(getOneReturnPosSales);
SalesPosRout.route("/canceled_receipt/:id").put(canceledPosSales);
SalesPosRout.route("/:id").get(findOneSalsePos).put(editPosOrder);
SalesPosRout.route("/dailyreceipt/:id").get(getReceiptForDate);
SalesPosRout.route("/dailyrefundreceipt/:id").get(getRefundReceiptForDate);

module.exports = SalesPosRout;
