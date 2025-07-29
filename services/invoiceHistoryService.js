const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const invoiceHistoryModel = require("../models/invoiceHistoryModel");
const emoloyeeShcema = require("../models/employeeModel");
const { ObjectId } = require("mongodb");
const ApiError = require("../utils/apiError");

// Create a new invoice history entry
// exports.createInvoiceHistory = asyncHandler(async (req, res) => {
//     try {
//         const dbName = req.body.databaseName;
//         const db = mongoose.connection.useDb(dbName);

//         const invoiceHistoryModel = db.model("invoiceHistory", invoiceHistorySchema);

//         const invoiceHistoryData = new invoiceHistoryModel({
//             invoiceId: req.body.invoiceId,
//             historyType: req.body.historyType,
//             employeeId: req.body.employeeId,
//         });
//         const savedInvoiceHistory = await invoiceHistoryModel.create(invoiceHistoryData);

//         res.status(201).json({ status: "true", data: savedInvoiceHistory });
//     } catch (error) {
//         console.log(error.message);
//         res.status(500).json({ status: "false", error: error.message });
//     }
// });

exports.createInvoiceHistory = async (
  companyId,
  invoiceId,
  historyType,
  employeeId,
  formattedDate,
  desc,
  from
) => {
  try {
    const invoiceHistoryData = new invoiceHistoryModel({
      companyId,
      invoiceId,
      historyType,
      employeeId,
      date: formattedDate,
      desc: desc,
      from: from,
    });
    const savedInvoiceHistory = await invoiceHistoryModel.create(
      invoiceHistoryData
    );

    return savedInvoiceHistory;
  } catch (error) {
    console.log(error.message);
    return new ApiError(
      `Error creating invoice history: ${error.message}`,
      500
    );
  }
};

// Retrieve invoice history by invoice ID
exports.getInvoiceById = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  try {
    // Validate if the id is a valid ObjectId
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "false", error: "Invalid invoiceId format" });
    }

    // Convert id to ObjectId
    const objectId = new ObjectId(id);

    const invoiceHistory = await invoiceHistoryModel
      .find({ invoiceId: objectId, companyId })
      .populate("employeeId");

    res.status(200).json({ status: "true", data: invoiceHistory });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ status: "false", error: error.message });
  }
});
