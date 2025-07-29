const mongoose = require("mongoose");
const PaymentHistoryModel = require("../models/paymentHistoryModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

const createPaymentHistory = async (
  type,
  date,
  rest,
  amount,
  taker,
  id,
  ref,
  companyId,
  description,
  idPaymet,
  paymentText,
  refText,
  transactionCurrency
) => {
  try {
    // Create a new payment history object
    const newPaymentHistoryData = {
      companyId,
      type,
      date,
      rest,
      amount,
      ref,
      description,
      idPaymet,
      paymentText,
      refText,
      transactionCurrency,
    };
    // Dynamically assign supplierId or customerId based on the taker value
    if (taker === "supplier") {
      newPaymentHistoryData.supplierId = id;
    } else {
      newPaymentHistoryData.customerId = id;
    }

    const newPaymentHistory = new PaymentHistoryModel(newPaymentHistoryData);
    const savedPaymentHistory = await newPaymentHistory.save();
    return savedPaymentHistory;
  } catch (error) {
    throw new ApiError(`Error creating payment history: ${error.message}`, 500);
  }
};

const getPaymentHistory = asyncHandler(async (req, res, next) => {

  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  const { id } = req.params;

  let query = { $or: [{ customerId: id }, { supplierId: id }] };

  // Fetch all transactions up to the current page
  const allTransactions = await PaymentHistoryModel.find(query).sort({
    date: 1,
  });
  // console.log(allTransactions);
  let runningBalance = 0;
  allTransactions.forEach((transaction) => {
    if (
      (transaction.type === "payment" ||
        transaction.type === "Refund Invoice") &
      (transaction.paymentText === "Deposit")
    ) {
      runningBalance -= transaction?.rest;
    } else {
      runningBalance += transaction?.rest;
    }
    transaction.runningBalance = runningBalance;
  });

  // Sort transactions in descending order before applying pagination
  const sortedTransactions = allTransactions.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Apply pagination to the transactions with running balances
  const paginatedTransactions = sortedTransactions.slice(skip, skip + pageSize);

  const totalItems = allTransactions.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  res.status(200).json({
    status: "true",
    pages: totalPages,
    results: paginatedTransactions.length,
    data: paginatedTransactions,
  });
});

const editPaymentHistory = async (
  dbName,
  openingBalanceId,
  openingBalance,
  date,
  amountBalance
) => {
  const db = mongoose.connection.useDb(dbName);
  const PaymentHistoryModel = db.model("PaymentHistory", PaymentHistorySchema);
  const paymentHistory = await PaymentHistoryModel.findOne({
    _id: openingBalanceId,
  });

  paymentHistory.rest = openingBalance;
  paymentHistory.amount = amountBalance;
  paymentHistory.date = date;
  paymentHistory.save();
  return paymentHistory;
};

module.exports = {
  createPaymentHistory,
  getPaymentHistory,
  editPaymentHistory,
};
