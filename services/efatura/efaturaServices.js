const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const orderSchema = require("../../models/orderModel");
const { default: axios } = require("axios");
const { createInvoiceHistory } = require("../invoiceHistoryService");

// Create E-Fatura
exports.createEFatura = asyncHandler(async (req, res, next) => {
  const url = process.env.efatura_test_v1;
  const urlV2 = process.env.efatura_test_v2;
  const token = process.env.efatura_token;

  const orderNumber = req.body?.orderInfoModel?.orderNumber;
  const { type } = req.params;

  if (!orderNumber) {
    console.log("Missing orderNumber in request body.");
    return res.status(400).json({ status: "error", message: "orderNumber" });
  }

  if (!type) {
    console.log("Missing type in request params.");
    return res.status(400).json({ status: "error", message: "type" });
  }

  try {
    const response = await axios.post(
      `${type === "efatura" ? url : urlV2}${
        type === "efatura" ? "outboxinvoice" : "earchive"
      }/create`,
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": token,
        },
      }
    );

    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const orderModel = db.model("Sales", orderSchema);
    const timeIsoString = new Date().toISOString();

    await orderModel.findByIdAndUpdate(
      orderNumber,
      {
        efaturaGenerated: true,
        ettn: response?.data?.id,
        efaturaStatus: "0",
      },
      { new: true }
    );

    createInvoiceHistory(
      dbName,
      orderNumber,
      "edit",
      req.user._id,
      req.body.orderInfoModel?.orderDate || timeIsoString
    );

    return res.status(201).json({
      status: "success",
      message: "SUCCESS",
      data: response.data,
    });
  } catch (error) {
    console.error("E-Fatura Error Response:", error.response.data);
    return res.status(500).json({
      status: "error",
      message: "E-Fatura request failed",
      details: error.response.data,
    });
  }
});
