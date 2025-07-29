const express = require("express");
const {
  getAllPurchaseRequest,
  createCashPurchaseRequest,
  getPurchaseRequestById,
  updatePurchaseRequest,
} = require("../services/purchaseRequestServices");
const authService = require("../services/authService");

const purchaseRequestRouter = express.Router();
purchaseRequestRouter.use(authService.protect);

// Create a new purchaseRequest / Get all purchaseRequests
purchaseRequestRouter
  .route("/")
  .post(createCashPurchaseRequest)
  .get(getAllPurchaseRequest);

// Get / update / delete a specific purchaseRequest by ID
purchaseRequestRouter
  .route("/:id")
  .get(getPurchaseRequestById)
  .put(updatePurchaseRequest);

module.exports = purchaseRequestRouter;
