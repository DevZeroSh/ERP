const express = require("express");
const authService = require("../services/authService");
const {
  findAllProductInvoices,
  findOneProductInvoices,
  refundPurchaseInvoice,
  getReturnPurchase,
  getOneReturnPurchase,
  createPurchaseInvoice,
  cancelPurchaseInvoice,
  updatePurchaseInvoices,
  findSupplier,
  uploadFile,
} = require("../services/purchaseInvoicesServices");
const PurchaseInvoices = express.Router();
PurchaseInvoices.use(authService.protect);

PurchaseInvoices.route("/refund")
  .get(getReturnPurchase)
  .post(uploadFile, refundPurchaseInvoice);
PurchaseInvoices.route("/supplierinvoices/:id").get(findSupplier);

PurchaseInvoices.route("/refund/:id").get(getOneReturnPurchase);
PurchaseInvoices.route("/")
  .post(uploadFile, createPurchaseInvoice)
  .get(findAllProductInvoices);
PurchaseInvoices.route("/:id")
  .get(findOneProductInvoices)
  .put(uploadFile, updatePurchaseInvoices)
  .delete(cancelPurchaseInvoice);

module.exports = PurchaseInvoices;
