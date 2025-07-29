const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const ReportsFinancialFundsModel = require("../models/reportsFinancialFunds");
const financialFundsSchema = require("../models/financialFundsModel");

//get all financial funds reports
exports.getReportsFinancialFunds = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { startDate, endDate } = req.query;

  let dateFilter = { companyId };
  if (startDate && endDate) {
    dateFilter = {
      date: {
        $gte: new Date(startDate + "T00:00:00.000Z"),
        $lte: new Date(endDate + "T23:59:59.999Z"),
      },
    };
  }

  const financialFundReports = await ReportsFinancialFundsModel.find({
    archives: { $ne: true },
    ...dateFilter,
  })
    .sort({ date: -1 })
    .populate({
      path: "financialFundId",
      select: "fundName activeinpos",
    });

  res.status(200).json({ status: "true", data: financialFundReports });
});

//Bring all reports related to a specific financial fund id
exports.getSpecificReports = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const pageSize = req.query.limit || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { startDate, endDate } = req.query;
  let dateFilter = { companyId };
  if (startDate && endDate) {
    dateFilter = {
      $gte: new Date(startDate + "T00:00:00.000Z"),
      $lte: new Date(endDate + "T23:59:59.999Z"),
    };
  }

  // Step 1: Get all transactions (regardless of date) to calculate full running balance
  const allReports = await ReportsFinancialFundsModel.find({
    financialFundId: id,
    companyId,
  }).sort({ date: 1 }); // Oldest to newest

  let runningBalance = 0;
  let fundBalance = 0;

  const reportsWithBalance = allReports.map((report) => {
    const amount = report.amount || 0;
    const isNegative = [
      "Withdrawal",
      "expense",
      "purchase",
      "transfer_to",
      "refund-sales",
      "payment-sup",
      "cancel",
      "Withdrawal transfer",
      "Salary",
    ].includes(report.type);

    runningBalance += isNegative ? -amount : amount;

    return {
      ...report.toObject(),
      runningBalance,
    };
  });

  fundBalance = runningBalance;

  // Step 2: Apply date filter after calculating running balance
  let filteredReports = reportsWithBalance;
  if (startDate && endDate) {
    filteredReports = filteredReports.filter((r) => {
      const reportDate = new Date(r.date);
      return reportDate >= dateFilter.$gte && reportDate <= dateFilter.$lte;
    });
  }

  // Step 3: Sort by date descending
  filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Step 4: Pagination
  const paginatedTransactions = pageSize
    ? filteredReports.slice(skip, skip + pageSize)
    : filteredReports;
  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Step 5: Send response
  res.status(200).json({
    status: "true",
    totalPages,
    results: paginatedTransactions.length,
    data: paginatedTransactions,
    fundBalance,
  });
});
