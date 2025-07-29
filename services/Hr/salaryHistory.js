const asyncHandler = require("express-async-handler");
const SalaryHistoryModel = require("../../models/Hr/salaryHistoryModel");
const StaffSchema = require("../../models/Hr/staffModel");
const ApiError = require("../../utils/apiError");
const { default: mongoose } = require("mongoose");
const FinancialFundsModel = require("../../models/financialFundsModel");
const reportsFinancialFundsSchema = require("../../models/reportsFinancialFunds");
const currencySchema = require("../../models/currencyModel");

exports.getSalaryHistories = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  const totalItems = await SalaryHistoryModel.countDocuments({ companyId });

  const totalPages = Math.ceil(totalItems / pageSize);
  const salaryHistory = await SalaryHistoryModel.find({ companyId })
    .skip(skip)
    .limit(pageSize)
    .populate("employeeId");
  res.status(200).json({
    status: "success",
    results: salaryHistory.length,
    totalPages: totalPages,
    data: salaryHistory,
  });
});

exports.getOneSalaryHistory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  const salaryHistory = await SalaryHistoryModel.findOne({
    _id: id,
    companyId,
  }).populate("employeeId");

  if (!salaryHistory) {
    return next(new ApiError(`no history by this id ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    data: salaryHistory,
  });
});

exports.getSalaryisHistoryForStaff = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const { id } = req.params;
    const pageSize = req.query.limit || 0;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * pageSize;

    const totalItems = await SalaryHistoryModel.countDocuments({
      employeeId: id,
      companyId,
    });

    const totalPages = Math.ceil(totalItems / pageSize);
    const salaryHistory = await SalaryHistoryModel.find({
      employeeId: id,
      companyId,
    })
      .skip(skip)
      .limit(pageSize)
      .sort({ paymentDate: -1 })
      .populate("employeeId");

    if (salaryHistory.length === 0) {
      return next(new ApiError(`dont have any data for this id ${id}`, 404));
    }

    let runningBalance = 0;
    const updatedSalaryHistory = salaryHistory.map((salary) => {
      runningBalance += Number(salary.totalSalary) - Number(salary.paidAmount);
      return {
        ...salary.toObject(),
        remainingAmount: runningBalance,
      };
    });

    res.status(200).json({
      status: "success",
      results: updatedSalaryHistory.length,
      totalPages,
      data: updatedSalaryHistory,
    });
  } catch (error) {
    next(error);
  }
});

exports.createOneSalaryHistory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const createSalary = await SalaryHistoryModel.create(req.body);

  res.status(200).json({
    status: "success",
    message: "Salary history created",
    data: createSalary,
  });
});

exports.updateOneSalaryHistory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;

  const salaryHistory = await SalaryHistoryModel.findByIdAndUpdate(
    { _id: id, companyId },
    req.body,
    { new: true }
  );

  if (!salaryHistory) {
    return next(new ApiError(`no history by this id ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    message: "Salary history updated",
    data: salaryHistory,
  });
});

exports.createSalaryHistories = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    req.body.companyId = companyId;

    const staffList = await StaffModel.find({ companyId });
    const fund = await FinancialFundsModel.findOne({
      _id: req.body.fundId,
      companyId,
    });

    if (fund) {
      fund.fundBalance -= req.body.paymentinfundCurrency || 0;

      fund.save();

      await reportsFinancialFundsSchema.create({
        date: req.body.date || new Date().toISOString(),
        amount: req.body.fundBalance || 0,
        type: "Salary Paid",
        financialFundId: fund._id,
        financialFundRest: req.body.fundBalance,
        paymentType: req.body.fundBalance > 0 ? "Deposit" : "Withdrawal",
        companyId,
      });
    }

    const salaryHistoryData = staffList
      .filter(
        (date) =>
          date.dateSalaryDue?.slice(8, 10) <=
          new Date().toISOString().slice(8, 10)
      )
      .map((item) => ({
        employeeId: item._id,
        month: new Date().toISOString().slice(0, 10),
        totalSalary: item.salary || 0,
        paidAmount: item.paidSalary || 0,
        remainingAmount: (item.salary || 0) - (item.paidSalary || 0),
        status:
          (item.salary || 0) - (item.paidSalary || 0) > 0 ? "Unpaid" : "Paid",
        paymentDate: null,
        paymentMethod: null,
        transactionId: null,
        salaryBreakdown: {
          baseSalary: item.salary || 0,
          bonus: 0,
          deductions: 0,
        },
        desc: `Salary record for ${item.name}`,
        companyId,
      }));

    await SalaryHistoryModel.insertMany(salaryHistoryData);

    res.status(200).json({
      success: true,
      message: "Salary history records created successfully",
    });
  } catch (error) {
    next(error);
  }
});

exports.paidSalaryOneStaff = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amountPaid, fundID, paymentInFundCurrency } = req.body;
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    if (!amountPaid || amountPaid <= 0) {
      return next(new ApiError("The Payment will be > 0", 400));
    }

    let unpaidSalaries = await SalaryHistoryModel.find({
      employeeId: id,
      status: { $ne: "Paid" },
      companyId,
    }).sort({ month: 1 });

    if (unpaidSalaries.length === 0) {
      return next(new ApiError("No salary Unpaid", 404));
    }

    let remainingAmountToPay = amountPaid;

    for (let salary of unpaidSalaries) {
      if (remainingAmountToPay <= 0) break;

      const remaining =
        salary.totalSalary -
        salary.paidAmount +
        salary.salaryBreakdown.bonus -
        salary.salaryBreakdown.deductions;
      if (remainingAmountToPay >= remaining) {
        salary.paidAmount += remaining;
        salary.remainingAmount = 0;
        salary.status = "Paid";
        remainingAmountToPay -= remaining;
      } else {
        salary.paidAmount += remainingAmountToPay;
        salary.remainingAmount -= remainingAmountToPay;
        salary.status = "Partial";
        remainingAmountToPay = 0;
      }

      await salary.save();
    }

    const fund = await FinancialFundsModel.findOneAndUpdate(
      { _id: fundID, companyId },
      {
        $inc: { fundBalance: -paymentInFundCurrency },
      },
      { new: true }
    );
    if (!fund) {
      return next(new ApiError(`No fund by this id ${fundID}`, 404));
    }
    reportsFinancialFundsSchema.create({
      date: req.body.date || new Date().toISOString(),
      invoice: id,
      amount: paymentInFundCurrency,
      type: "Salary Paid",
      exchangeRate: req.body.exchangeRate,
      financialFundId: fundID,
      financialFundRest: fund.fundBalance,
      paymentType: "Withdrawal",
      companyId,
    });
    res.status(200).json({
      status: "success",
      message: "Salary Paid Successfully",
    });
  } catch (error) {
    next(error);
  }
});

exports.paidSalaryForAllStaff = asyncHandler(async (req, res, next) => {
  try {
    const { fundID, paymentInFundCurrency } = req.body;
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    if (!paymentInFundCurrency || paymentInFundCurrency <= 0) {
      return next(new ApiError("The Payment will be > 0", 400));
    }
    let unpaidSalaries = await SalaryHistoryModel.find({
      status: "Unpaid",
      companyId,
    });
    const totalUnpaidSalary = unpaidSalaries.reduce(
      (sum, item) => sum + item.totalSalary,
      0
    );

    await SalaryHistoryModel.bulkWrite(
      unpaidSalaries.map((salary) => ({
        updateOne: {
          filter: { _id: salary._id },
          update: { $set: { status: "Paid", paidAmount: salary.totalSalary } },
        },
      }))
    );
    if (unpaidSalaries.length === 0) {
      return next(new ApiError("No salary Unpaid", 404));
    }
    const fund = await FinancialFundsModel.findOneAndUpdate(
      { _id: fundID, companyId },
      {
        $inc: { fundBalance: -paymentInFundCurrency },
      },
      { new: true }
    );
    if (!fund) {
      return next(new ApiError(`No fund by this id ${fundID}`, 404));
    }
    reportsFinancialFundsSchema.create({
      date: req.body.date || new Date().toISOString(),
      invoice: null,
      amount: paymentInFundCurrency,
      type: "Salary Paid",
      exchangeRate: req.body.exchangeRate,
      financialFundId: fundID,
      financialFundRest: fund.fundBalance,
      paymentType: "Withdrawal",
      companyId,
    });
    res.status(200).json({
      status: "success",
      message: "Salary Paid Successfully",
    });
  } catch (error) {
    next(error);
  }
});

exports.unpaidSalaryForAllStaff = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  const totalItems = await SalaryHistoryModel.countDocuments({ companyId });

  const totalPages = Math.ceil(totalItems / pageSize);
  const salaryHistory = await SalaryHistoryModel.find({
    status: { $ne: "Paid" },
    companyId,
  })
    .skip(skip)
    .limit(pageSize)
    .populate("employeeId")
    .populate({
      path: "employeeId",
      populate: { path: "currency" },
    });

  res.status(200).json({
    status: "success",
    results: salaryHistory.length,
    totalPages: totalPages,
    data: salaryHistory,
  });
});
