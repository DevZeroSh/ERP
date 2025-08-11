const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const FinancialFundsModel = require("../models/financialFundsModel");
const ReportsFinancialFundsModel = require("../models/reportsFinancialFunds");
const SalesPointModel = require("../models/salesPointModel");
const paymentModel = require("../models/paymentModel");

//@desc Get list of Financial Funds
//@route GET  /api/financialfunds
//@accsess Private
exports.getFinancialFunds = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  let query = { archives: { $ne: false }, companyId };

  const tagIds = Object.keys(req.query)
    .filter((key) => !isNaN(key))
    .map((key) => req.query[key]);

  // If tagIds exist, filter by tags. Otherwise, return all funds.
  if (tagIds.length > 0) {
    query["$or"] = [
      { "tags.id": { $in: tagIds } },
      { tags: { $exists: false } },
      { tags: { $size: 0 } },
    ];
  }

  const financialFunds = await FinancialFundsModel.find(query)
    .populate({
      path: "fundCurrency",
      select: "_id currencyCode currencyName exchangeRate",
    })
    .populate({
      path: "linkAccount",
      populate: { path: "currency" },
    });

  res.status(200).json({ status: "true", data: financialFunds });
});

// @desc Create a Financial Funds
// @route Post /api/financialfunds
// @access Private
exports.createFinancialFunds = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const data = new Date();
  const Time = data.toISOString();
  const financialFunds = await FinancialFundsModel.create(req.body);
  await ReportsFinancialFundsModel.create({
    date: Time,
    amount: req.body.fundBalance,
    type: "Opening Balance",
    financialFundId: financialFunds._id,
    financialFundRest: req.body.fundBalance,
    paymentType: req.body.fundBalance > 0 ? "Deposit" : "Withdrawal",
    companyId,
  });
  res.status(201).json({
    status: "true",
    message: "Financial Fund Inserted",
    data: financialFunds,
  });
});

// @desc Get specific a Financial Funds by id
// @route Get /api/financialfunds/:id
// @access Private
exports.getOneFinancialFund = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const reportsFinancialFunds = await ReportsFinancialFundsModel.findOne({
    type: "Opening Balance",
    financialFundId: id,
    companyId,
  });
  const financialFunds = await FinancialFundsModel.findOne({
    _id: id,
    companyId,
  })
    .populate({
      path: "fundCurrency",
      select: "_id currencyCode currencyName exchangeRate",
    })
    .populate("linkAccount")
    .populate({
      path: "linkAccount",
      populate: { path: "currency" },
    });
  res.status(200).json({
    status: "true",
    data: financialFunds,
    openBalance: reportsFinancialFunds,
  });
});

//@desc update specific Financial Fund by id
//@route Put /api/financialfunds/:id
//@access Private
exports.updateFinancialFund = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    req.body.companyId = companyId;
    // Fetch the financial fund
    let financialFund = await FinancialFundsModel.findOne({
      _id: id,
      companyId,
    }).populate({
      path: "fundCurrency",
      select: "_id currencyCode currencyName exchangeRate",
    });

    if (!financialFund) {
      return next(
        new ApiError(`No financial fund found for this id: ${id}`, 404)
      );
    }

    // Handle Opening Balance Updates
    if (req.body.haveOpeningBalance) {
      // Update the fund balance
      const updateFields = { ...req.body };
      delete updateFields.fundBalance;

      const updateQuery = {
        $set: updateFields,
        $inc: { fundBalance: req.body.fundBalance - req.body.fundBalanceBefor },
      };

      financialFund = await FinancialFundsModel.findOneAndUpdate(
        { _id: id, companyId },
        updateQuery,
        { new: true }
      );

      // Update the associated report
      await ReportsFinancialFundsModel.findOneAndUpdate(
        { type: "Opening Balance", financialFundId: id, companyId },
        {
          financialFundRest: req.body.journalBalance,
          amount: req.body.journalBalance,
        },
        { new: true, upsert: true }
      );

      // Update journal entry
      const updateJournalBefor = await journalModel.findOne({
        linkCounter: financialFund.journalCounter,
        companyId,
      });

      const updateJournal = await journalModel.findOneAndUpdate(
        { linkCounter: financialFund.journalCounter, companyId },
        {
          journalCredit: req.body.fundBalance,
          journalDebit: req.body.fundBalance,
          "journalAccounts.0.accountDebit":
            req.body.fundBalance / financialFund.fundCurrency.exchangeRate,
          "journalAccounts.0.MainDebit": req.body.fundBalance,
          "journalAccounts.1.MainCredit": req.body.fundBalance,
          "journalAccounts.1.accountCredit":
            req.body.fundBalance / financialFund.fundCurrency.exchangeRate,
        },
        { new: true }
      );

      // Update accounting tree records
      if (updateJournalBefor) {
        const updateOperations = updateJournalBefor.journalAccounts.map(
          (item) => ({
            updateOne: {
              filter: { _id: item.id },
              update: {
                $inc: {
                  debtor: -item.MainDebit || 0,
                  creditor: -item.MainCredit || 0,
                },
              },
            },
          })
        );

        await accountingTreeModel.bulkWrite(updateOperations);

        const updateOperations2 = updateJournal.journalAccounts.map((item) => ({
          updateOne: {
            filter: { _id: item.id },
            update: {
              $inc: {
                debtor: item.MainDebit || 0,
                creditor: item.MainCredit || 0,
              },
            },
          },
        }));

        await accountingTreeModel.bulkWrite(updateOperations2);
      }
    } else {
      // Normal update without opening balance logic
      financialFund = await FinancialFundsModel.findOneAndUpdate(
        { _id: id, companyId },
        req.body,
        { new: true }
      ).populate({
        path: "fundCurrency",
        select: "_id currencyCode currencyName exchangeRate",
      });
    }

    // Respond with updated data
    res.status(200).json({
      status: "true",
      message: "Financial fund updated",
      data: financialFund,
    });
  } catch (error) {
    return next(new ApiError(error.message, 500));
  }
});

//@desc Delete specific Financial fund
//@rout Delete /api/financialfunds/:id
//@access priveta
exports.deletefinancialFund = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  //check if id is used in anther place or not
  //if (checkIdIfUsed(id, "FinancialFunds")) {}
  const ReportsFinancialFunds = await ReportsFinancialFundsModel.countDocuments(
    {
      financialFundId: id,
      companyId,
    }
  ).limit(5);

  if (ReportsFinancialFunds <= 1) {
    const financialFund = await FinancialFundsModel.findOneAndDelete({
      _id: id,
      companyId,
    });
    if (!financialFund) {
      return next(new ApiError(`No financial fund for this id ${id}`, 404));
    }
    res.status(200).json({ status: "true", message: "Financial fund Deleted" });
  } else {
    res.status(403).json({ message: "There are operations here." });
  }
});

// @desc Transfer from fund to fund
// @route Post /api/transferfinancialfunds
// @access Private

exports.transfer = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
 const padZero = (value) => (value < 10 ? `0${value}` : value);
  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}.${padZero(date_ob.getMilliseconds(), 3)}`;

  const { id } = req.params;
  const {
    fund,
    fundFromAmount,
    exchangeRate,
    fundToAmount,
    fundNameto,
    fundNamefrom,
    description,
    fromFundCurrencyCode,
    totalMainCurrency,
  } = req.body;
  const dateAndTime = `${req.body.date}T${formattedDate}Z`;
  req.body.date = dateAndTime;
  // 1) Take the first Fund
  const financialFund = await FinancialFundsModel.findOneAndUpdate({
    _id: id,
    companyId,
  });

  // 2) Save the value with which the transfer will be made

  let beforTransfer = financialFund.fundBalance - fundFromAmount;
  let after = financialFund.fundBalance - beforTransfer;
  financialFund.fundBalance -= after;

  // 3) Find the fund to which the money will go
  const funds = await FinancialFundsModel.findOneAndUpdate({
    _id: fund,
    companyId,
  });
  funds.fundBalance += parseFloat(fundToAmount);

  // 4) Save
  req.body.counter = (await paymentModel.countDocuments({ companyId })) + 1;

  const payment = await paymentModel.create({
    total: fundFromAmount,
    financialFundsCurrencyCode: fromFundCurrencyCode,
    exchangeRate,
    date: req.body.date,
    counter: req.body.counter,
    financialFundsName: fundNamefrom,
    paymentInFundCurrency: fundFromAmount,
    paymentCurrency: fromFundCurrencyCode,
    type: "Transfer",
    totalMainCurrency: totalMainCurrency,
    financialFundsId: id,
    journalCounter: req.body.journalCounter,
    companyId,
  });

  await financialFund.save();
  await ReportsFinancialFundsModel.create({
    date: req.body.date,
    amount: after,
    type: "Withdrawal transfer",
    exchangeRate: exchangeRate,
    fundNameto: fundNameto,
    amountToFund: fundToAmount,
    financialFundId: id,
    financialFundRest: financialFund.fundBalance,
    paymentType: "Withdrawal",
    description: description,
    ref: payment._id,
    payment: payment._id,
    companyId,
  });
  await funds.save();
  await ReportsFinancialFundsModel.create({
    date: req.body.date,
    amount: fundToAmount,
    exchangeAmount: fundToAmount,
    exchangeRate: exchangeRate,
    fundNameform: fundNamefrom,
    type: "Deposit transfer",
    financialFundId: fund,
    financialFundRest: funds.fundBalance,
    paymentType: "Deposit",
    description: description,
    ref: payment._id,
    payment: payment._id,
    companyId,
  });

  res.status(200).json({
    status: "true",
    message: "Financial fund updated",
    data: financialFund,
    data2: funds,
  });
});

exports.getFinancialFundForSalesPoint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  // Find the sales point by its ID
  const salesPoint = await SalesPointModel.findOne({ _id: id, companyId });

  if (!salesPoint) {
    return res.status(404).json({ message: "Sales point not found" });
  }

  // Fetch all funds by their IDs
  const funds = await Promise.all(
    salesPoint.funds.map(async (fundItem) => {
      return FinancialFundsModel.findOne({
        _id: fundItem.id,
        companyId,
      }).populate({
        path: "fundCurrency",
        select: "_id currencyCode currencyName exchangeRate",
      });
    })
  );

  // Return the funds data
  res.status(200).json({
    success: true,
    data: funds,
  });
});
