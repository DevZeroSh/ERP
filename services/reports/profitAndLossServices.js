const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const profitAndLossModel = require("../../models/reports/profitAndLossModel");

exports.getAllProfitAndLossReports = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { companyId };

  const totalItems = await profitAndLossModel.countDocuments(query);

  const profitAndLoss = await profitAndLossModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);
  res.status(200).json({
    status: "success",
    totalPages,
    results: totalItems,
    data: profitAndLoss,
  });
});

exports.createProfitAndLossReport = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const createProfitAndLoss = await profitAndLossModel.create(req.body);
  res.status(201).json({
    status: "success",
    message: "Report Created",
    data: createProfitAndLoss,
  });
});

exports.getProfitAndLossReport = asyncHandler(async (req, res, next) => {
  const { companyId, fromDate, toDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const accounts = await AccountingTree.aggregate([
    {
      $match: {
        companyId,
        accountType: { $in: ["income", "expense", "costOfGoodsSold"] },
      },
    },
    {
      $lookup: {
        from: "journals",
        localField: "_id",
        foreignField: "accountId",
        as: "journals",
      },
    },
    { $unwind: { path: "$journals", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        "journals.date": {
          $gte: fromDate ? new Date(fromDate) : new Date("1970-01-01"),
          $lte: toDate ? new Date(toDate) : new Date(),
        },
      },
    },
    {
      $group: {
        _id: "$accountType",
        total: { $sum: "$journals.amount" },
      },
    },
  ]);

  let income = 0,
    expenses = 0,
    cogs = 0;

  accounts.forEach((acc) => {
    if (acc._id === "income") income = acc.total;
    if (acc._id === "expense") expenses = acc.total;
    if (acc._id === "costOfGoodsSold") cogs = acc.total;
  });

  const netProfit = income - (cogs + expenses);

  res.status(200).json({
    income,
    cogs,
    expenses,
    netProfit,
  });
});

exports.getProfitAndLossReport = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const profitAndLoss = await profitAndLossModel.findOne({
    _id: id,
    companyId,
  });
  if (!profitAndLoss) {
    return next(new ApiError(`No Report found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: profitAndLoss });
});
