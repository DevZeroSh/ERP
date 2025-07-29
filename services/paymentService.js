const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const paymentModel = require("../models/paymentModel");
const mongoose = require("mongoose");
const supplerModel = require("../models/suppliersModel");
const customerModel = require("../models/customarModel");
const ReportsFinancialFundsModel = require("../models/reportsFinancialFunds");
const FinancialFundsModel = require("../models/financialFundsModel");
const PurchaseInvoicesModel = require("../models/purchaseinvoicesModel");
const salesrModel = require("../models/orderModel");
const { createPaymentHistory } = require("./paymentHistoryService");
const paymentHistoryModel = require("../models/paymentHistoryModel");
const expensesModel = require("../models/expensesModel");
const { createInvoiceHistory } = require("./invoiceHistoryService");
const RefundPurchaseInvoicesModel = require("../models/refundPurchaseInviceModel");
const StaffModel = require("../models/Hr/staffModel");
const SalaryHistoryModel = require("../models/Hr/salaryHistoryModel");
const returnOrderModel = require("../models/returnOrderModel");
const accountingTree = require("../models/accountingTreeModel");

async function recalculateBalances(startDate, companyId) {
  // Fetch transactions (purchases and sales) that are affected
  const affectedPurchases = await PurchaseInvoicesModel.find({
    date: { $gte: startDate },
    companyId,
  }).sort({ date: 1 });

  const affectedSales = await salesrModel
    .find({
      date: { $gte: startDate },
      companyId,
    })
    .sort({ date: 1 });

  // Recalculate balances
  recalculatePurchaseBalances(affectedPurchases);
  recalculateSalesBalances(affectedSales);
}

// Helper function to recalculate purchase balances
function recalculatePurchaseBalances(purchases) {
  let cumulativeBalance = 0;
  for (const purchase of purchases) {
    purchase.totalRemainderMainCurrency =
      purchase.totalAmount - cumulativeBalance;
    cumulativeBalance += purchase.totalRemainderMainCurrency;
  }
}

// Helper function to recalculate sales balances
function recalculateSalesBalances(sales) {
  let cumulativeBalance = 0;
  for (const sale of sales) {
    sale.totalRemainderMainCurrency = sale.totalAmount - cumulativeBalance;
    cumulativeBalance += sale.totalRemainderMainCurrency;
  }
}

const financailSource = async (taker, source, companyId, data, next) => {
  try {
    const amount = Number(data.totalMainCurrency);
    if (taker === "supplier") {
      await supplerModel.findOneAndUpdate(
        { _id: source.id, companyId },
        { $inc: { TotalUnpaid: -amount } },
        { new: true }
      );
    } else if (taker === "customer") {
      await customerModel.findOneAndUpdate(
        { _id: source.id, companyId },
        { $inc: { TotalUnpaid: -amount } },
        { new: true }
      );
    } else if (taker === "account") {
      await accountingTree.findOneAndUpdate(
        { _id: source.id, companyId },
        {
          $inc: { debtor: amount },
        },
        { new: true }
      );
    } else {
      throw new Error("Invalid taker type.");
    }
  } catch (e) {
    console.log(`Error: ${e}`);
    next(e);
  }
};

exports.createPayment = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const date = Date.now();
  const date_ob = new Date(date);

  const formattedDate = `${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}.${padZero(date_ob.getMilliseconds(), 3)}`;

  const isoDate = `${req.body.date}T${formattedDate}Z`;
  req.body.date = isoDate;
  let financialFunds = null;
  let financialFundsId = null;

  financialFundsId = req.body?.financailSource?.id || req.body.financialFundsId;
  financialFunds = await FinancialFundsModel.findOne({
    _id: financialFundsId,
    companyId,
  });

  let paymentText = "";
  let payment;
  let paymentType = "";
  req.body.counter = (await paymentModel.countDocuments({ companyId })) + 1;
  const description = req.body.description;
  let tes1t = [];
  let sales = null;
  if (req.body.taker === "supplier") {
    const suppler = await supplerModel.findOne({
      _id: req.body.supplierId,
      companyId,
    });
    const totalMainCurrency = req.body.totalMainCurrency;
    let remainingPayment = totalMainCurrency;
    req.body.type = "supplier";
    req.body.isWithDraw === true
      ? (req.body.paymentText = "Withdrawal")
      : (req.body.paymentText = "Deposit");
    payment = await paymentModel.create(req.body);

    // Process Purchase Invoices
    const purchases = await PurchaseInvoicesModel.find({
      paid: "unpaid",
      "supllier.id": req.body.supplierId,
      type: { $ne: "cancel" },
      companyId,
    });

    const bulkPurchaseUpdates = [];

    for (const purchase of purchases) {
      if (remainingPayment <= 0 && req.body.isWithDraw === true) break;

      const paymentAmount = Math.min(
        purchase.totalRemainderMainCurrency,
        remainingPayment
      );

      const updateObj = {
        $set: {
          totalRemainderMainCurrency:
            purchase.totalRemainderMainCurrency - paymentAmount,
          totalRemainder:
            purchase.totalRemainder - paymentAmount * purchase.exchangeRate,
        },
        $push: {
          payments: {
            payment: paymentAmount * req.body?.exchangeRate,
            paymentMainCurrency: paymentAmount,
            financialFunds: req.body.financialFundsName,
            financialFundsCurrencyCode: req.body.financialFundsCurrencyCode,
            paymentID: payment._id,
            date: req.body.date,
            paymentInInvoiceCurrency:
              paymentAmount * (purchase?.currency?.exchangeRate || 1),
          },
        },
      };

      if (purchase.totalRemainderMainCurrency <= paymentAmount) {
        updateObj.$set.paid = "paid";
      }

      remainingPayment -= paymentAmount;
      tes1t.push({
        id: purchase._id,
        status: updateObj.$set.paid || purchase.paid,
        paymentInFundCurrency: parseFloat(
          paymentAmount * req.body.exchangeRate
        ),
        paymentMainCurrency: paymentAmount,
        invoiceTotal: purchase.totalPurchasePriceMainCurrency,
        invoiceName: purchase.invoiceName,
        invoiceCurrencyCode: purchase.currency.currencyCode,
        financialFundsId: financialFundsId,
        invoiceType: "purchase",
        paymentInvoiceCurrency:
          paymentAmount * (purchase.currency.exchangeRate || 1),
      });
      bulkPurchaseUpdates.push({
        updateOne: {
          filter: { _id: purchase._id },
          update: updateObj,
        },
      });
    }

    if (bulkPurchaseUpdates.length > 0) {
      await PurchaseInvoicesModel.bulkWrite(bulkPurchaseUpdates);
    }

    const expenses = await expensesModel.find({
      paymentStatus: "unpaid",
      "supllier.id": req.body.supplierId,
    });

    const bulkExpenseUpdates = [];

    for (const expense of expenses) {
      if (remainingPayment <= 0 && req.body.isWithDraw === true) break;

      const expenseAmount = Math.min(
        expense.totalRemainderMainCurrency,
        remainingPayment
      );

      const updateObj = {
        $set: {
          totalRemainderMainCurrency:
            expense.totalRemainderMainCurrency - expenseAmount,
          totalRemainder:
            expense.totalRemainder -
            expenseAmount * expense.currency.exchangeRate,
        },
        $push: {
          payments: {
            payment: expenseAmount * req.body?.exchangeRate,
            paymentMainCurrency: expenseAmount,
            financialFunds: req.body.financialFundsName,
            paymentID: payment._id,
            date: req.body.date,
            paymentInInvoiceCurrency:
              expenseAmount * expense?.currency.exchangeRate,
          },
        },
      };

      if (expense.totalRemainderMainCurrency <= expenseAmount) {
        updateObj.$set.paymentStatus = "paid";
      }

      remainingPayment -= expenseAmount;
      tes1t.push({
        id: expense._id,
        status: updateObj.$set.paymentStatus || expense.paymentStatus,
        paymentInFundCurrency: parseFloat(
          expenseAmount * req.body.exchangeRate
        ),
        paymentMainCurrency: expenseAmount,
        invoiceTotal: expense.expenceTotalMainCurrency,
        invoiceName: expense.expenseName,
        invoiceCurrencyCode: expense.currency.currencyCode,
        financialFundsId: financialFundsId,
        invoiceType: "expense",
        paymentInvoiceCurrency:
          expenseAmount * (expense.currency.exchangeRate || 1),
      });
      bulkExpenseUpdates.push({
        updateOne: {
          filter: { _id: expense._id },
          update: updateObj,
        },
      });
    }

    try {
      if (bulkExpenseUpdates.length > 0) {
        await expensesModel.bulkWrite(bulkExpenseUpdates);
      }
    } catch (err) {
      console.error("Bulk write error:", err);
    }

    // 3. Final accounting
    let patext = "";
    if (req.body.isWithDraw === true) {
      financialFunds.fundBalance -= Number(req.body.total);
      suppler.TotalUnpaid -= totalMainCurrency;
      paymentText = "Withdrawal";
      patext = "Deposit";
    } else {
      financialFunds.fundBalance += Number(req.body.total);
      suppler.TotalUnpaid += Number(totalMainCurrency);
      paymentText = "Deposit";
      patext = "Withdrawal";
    }

    await suppler.save();

    paymentType = paymentText;

    await createPaymentHistory(
      "payment",
      req.body.date || formattedDate,
      req.body.totalMainCurrency,
      req.body.paymentInFundCurrency,
      "supplier",
      req.body.supplierId,
      0,
      companyId,
      description,
      payment.id,
      patext,
      "",
      req.body.financialFundsCurrencyCode
    );
  } else if (req.body.taker === "customer") {
    const customer = await customerModel.findOne({
      _id: req.body.customerId,
      companyId,
    });

    const totalMainCurrency = req.body.totalMainCurrency;
    let remainingPayment = totalMainCurrency;
    req.body.type = "customer";
    req.body.isWithDraw === true
      ? (req.body.paymentText = "Withdrawal")
      : (req.body.paymentText = "Deposit");
    payment = await paymentModel.create(req.body);
    const sales = await salesrModel.find({
      paymentsStatus: "unpaid",
      "customer.id": req.body.customerId,
      type: { $ne: "cancel" },
      companyId,
    });

    const bulkUpdateOperations = sales
      .map((sale) => {
        const paymentAmount = Math.min(
          sale.totalRemainderMainCurrency,
          remainingPayment
        );
        if (paymentAmount === 0) return null;
        const updateObj = {
          $set: {
            totalRemainderMainCurrency: parseFloat(
              sale.totalRemainderMainCurrency - paymentAmount
            ),

            totalRemainder: parseFloat(
              sale.totalRemainder - paymentAmount * sale.currencyExchangeRate
            ),
          },
          $push: {
            payments: {
              payment: paymentAmount * req.body?.exchangeRate,
              paymentInFundCurrency: paymentAmount * req.body?.exchangeRate,
              paymentMainCurrency: paymentAmount,
              financialFunds: req.body.financialFundsName,
              financialFundsCurrencyCode: req.body.financialFundsCurrencyCode,
              paymentID: payment._id,
              invoiceTotal: paymentAmount * sale?.currency.exchangeRate,
              date: req.body.date || formattedDate,
              paymentInInvoiceCurrency:
                paymentAmount * sale?.currency.exchangeRate,
            },
          },
        };

        if (sale.totalRemainderMainCurrency <= paymentAmount) {
          updateObj.$set.paymentsStatus = "paid";
        }

        remainingPayment -= paymentAmount;

        tes1t.push({
          id: sale._id,
          status: updateObj.$set.paymentsStatus || sale.paymentsStatus,
          paymentInFundCurrency: parseFloat(
            paymentAmount * req.body.exchangeRate
          ),
          paymentMainCurrency: paymentAmount,
          invoiceTotal: sale.totalInMainCurrency,
          invoiceName: sale.invoiceName,
          invoiceCurrencyCode: sale.currency.currencyCode,
          financialFundsId: financialFundsId,
          paymentInvoiceCurrency:
            paymentAmount * (sale.currency.exchangeRate || 1),
        });
        return {
          updateOne: {
            filter: { _id: sale._id },
            update: updateObj,
          },
        };
      })
      .filter(Boolean);

    if (bulkUpdateOperations.length > 0 && req.body.isWithDraw === false) {
      await salesrModel.bulkWrite(bulkUpdateOperations);
    } else {
      tes1t = {
        id: "",
        status: "",
        paymentInFundCurrency: parseFloat(
          totalMainCurrency * req.body.exchangeRate
        ),
        paymentMainCurrency: totalMainCurrency,
        invoiceTotal: "0",
        invoiceName: "0",
        invoiceCurrencyCode: "N/A",
      };
    }

    if (req.body.isWithDraw === true) {
      financialFunds.fundBalance -= Number(req.body.total);
      paymentText = "Withdrawal";
      customer.TotalUnpaid += totalMainCurrency;
    } else {
      financialFunds.fundBalance += Number(req.body.total);
      paymentText = "Deposit";
      customer.TotalUnpaid -= totalMainCurrency;
    }
    (paymentType = paymentText), await customer.save();
    await createPaymentHistory(
      "payment",
      req.body.date || formattedDate,
      totalMainCurrency,
      req.body.paymentInFundCurrency,
      "customer",
      req.body.customerId,
      salesrModel.counter,
      companyId,
      description,
      payment.id,
      paymentText,
      "",
      req.body.financialFundsCurrencyCode
    );
  } else if (req.body.taker === "purchase") {
    const suppler = await supplerModel.findOne({
      _id: req.body.supplierId || req.body.suppliersId,
      companyId,
    });
    const purchase = await PurchaseInvoicesModel.findOne({
      _id: req.body.purchaseId,
      type: { $ne: "cancel" },
      companyId,
    });
    req.body.type = "purchase";
    req.body.paymentText = "Withdrawal";

    payment = await paymentModel.create(req.body);
    let paymentAmount = req.body.totalMainCurrency;
    let paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    let paymentInFundCurrency = req.body.paymentInFundCurrency;

    if (paymentAmount > purchase.totalRemainderMainCurrency) {
      paymentInFundCurrency;
      paymentAmount = purchase.totalRemainderMainCurrency;
      paymentInvoiceCurrency = purchase.totalRemainder;
    }
    purchase.totalRemainderMainCurrency -= req.body.totalMainCurrency;
    purchase.totalRemainder -= req.body.paymentInInvoiceCurrency;

    if (purchase.totalRemainderMainCurrency <= 0.9) {
      purchase.paid = "paid";
      purchase.totalRemainderMainCurrency = 0;
      purchase.totalRemainder = 0;
    }

    tes1t = {
      id: req.body.purchaseId,
      status: purchase.paid,
      paymentInFundCurrency: Number(req.body.paymentInFundCurrency),
      paymentInvoiceCurrency: Number(req.body.paymentInInvoiceCurrency),
      paymentMainCurrency: Number(req.body.totalMainCurrency),
      invoiceTotal: purchase.invoiceGrandTotal,
      invoiceName: purchase.invoiceName,
      invoiceCurrencyCode: purchase.currency.currencyCode,
    };
    suppler.TotalUnpaid -= req.body.totalMainCurrency;

    financialFunds.fundBalance -= Number(req.body.paymentInFundCurrency);
    purchase.payments.push({
      payment: paymentInFundCurrency || paymentAmount,
      paymentMainCurrency: paymentAmount,
      financialFunds: req.body.financialFundsName,
      paymentID: payment._id,
      financialFundsCurrencyCode: req.body.paymentCurrency,
      exchangeRate: req.body.exchangeRate,
      date: req.body.date || formattedDate,
      paymentInInvoiceCurrency: paymentInvoiceCurrency,
      financialFundsId: financialFundsId,
      financialFundsCurrencyCode: req.body.financialFundsCurrencyCode,
    });
    await suppler.save();
    const history = createInvoiceHistory(
      companyId,
      req.body.purchaseId,
      "payment",
      req.user._id,
      req.body.date,
      req.body.paymentInFundCurrency + " " + req.body.paymentCurrency,
      "invoice"
    );

    paymentText = "payment-sup";
    paymentType = "Withdrawal";

    await createPaymentHistory(
      "payment",
      req.body.date,
      req.body.totalMainCurrency,
      req.body.paymentInFundCurrency,
      "supplier",
      req.body.supplierId,
      req.body.purchaseId,
      companyId,
      description,
      payment.id,
      "Deposit",
      "",
      req.body.financialFundsCurrencyCode
    );

    await purchase.save();
  } else if (req.body.taker === "refund purchase") {
    const suppler = await supplerModel.findOne({
      _id: req.body.supplierId || req.body.suppliersId,
      companyId,
    });
    const refundPurchase = await RefundPurchaseInvoicesModel.findOne({
      _id: req.body.purchaseId,
      type: { $ne: "cancel" },
      companyId,
    });
    req.body.type = "refund purchase";
    req.body.paymentText = "Deposit";

    payment = await paymentModel.create(req.body);
    let paymentAmount = req.body.totalMainCurrency;
    let paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    let paymentInFundCurrency = req.body.paymentInFundCurrency;
    if (paymentAmount > refundPurchase.totalRemainderMainCurrency) {
      paymentInFundCurrency;
      paymentAmount = refundPurchase.totalRemainderMainCurrency;
      paymentInvoiceCurrency = refundPurchase.totalRemainder;
    }
    refundPurchase.totalRemainderMainCurrency -= req.body.totalMainCurrency;
    refundPurchase.totalRemainder -= req.body.paymentInInvoiceCurrency;
    if (refundPurchase.totalRemainderMainCurrency <= 0.9) {
      refundPurchase.paid = "paid";
      refundPurchase.totalRemainderMainCurrency = 0;
      refundPurchase.totalRemainder = 0;
    }
    tes1t = {
      id: req.body.purchaseId,
      status: refundPurchase.paid,
      paymentInFundCurrency: Number(req.body.paymentInFundCurrency),
      paymentInvoiceCurrency: Number(req.body.paymentInInvoiceCurrency),
      paymentMainCurrency: Number(req.body.totalMainCurrency),
      invoiceTotal: refundPurchase.invoiceGrandTotal,
      invoiceName: refundPurchase.invoiceName,
      invoiceCurrencyCode: refundPurchase.currency.currencyCode,
    };
    suppler.TotalUnpaid += req.body.totalMainCurrency;
    financialFunds.fundBalance += Number(req.body.paymentInFundCurrency);
    refundPurchase.payments.push({
      payment: paymentInFundCurrency || paymentAmount,
      paymentMainCurrency: paymentAmount,
      financialFunds: req.body.financialFundsName,
      paymentID: payment._id,
      financialFundsCurrencyCode: req.body.paymentCurrency,
      exchangeRate: req.body.exchangeRate,
      date: req.body.date || formattedDate,
      paymentInInvoiceCurrency: paymentInvoiceCurrency,
      financialFundsId: financialFundsId,
    });
    // await suppler.save();
    const history = createInvoiceHistory(
      companyId,
      req.body.purchaseId,
      "payment",
      req.user._id,
      req.body.date,
      req.body.paymentInFundCurrency + " " + req.body.paymentCurrency,
      "invoice"
    );

    paymentText = "purchase-refund";
    paymentType = "Deposit";
    await createPaymentHistory(
      "payment",
      req.body.date,
      req.body.totalMainCurrency,
      req.body.paymentInFundCurrency,
      "supplier",
      "",
      refundPurchase.counter,
      companyId,
      description,
      payment.id,
      paymentType,
      "",
      req.body.financialFundsCurrencyCode
    );

    await refundPurchase.save();
  } else if (req.body.taker === "sales") {
    sales = await salesrModel.findOne({
      _id: req.body.salesId,
      type: { $ne: "cancel" },
      companyId,
    });
    req.body.type = "sales";
    if (req.body.financailSource.type === "customer") {
      req.body.paymentText = "Withdrawal";
      paymentType = "Withdrawal";
    } else {
      req.body.paymentText = "Deposit";
      paymentType = "Deposit";
    }
    req.body.paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    req.body.financialFundsId = req.body.financailSource.id;
    req.body.financialFundsName = req.body.financailSource.name;
    req.body.financialFundsCurrencyCode = req.body.financailSource.code;
    req.body.financailType = req.body.financailSource.type;
    payment = await paymentModel.create(req.body);
    const customer = await customerModel.findById({
      _id: req.body.customerId,
      companyId,
    });
    paymentText = "payment-cut";

    let paymentAmount = req.body.totalMainCurrency;
    let paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    let paymentInFundCurrency = req.body.paymentInFundCurrency;
    customer.TotalUnpaid -= req.body.totalMainCurrency;
    await customer.save();

    if (paymentAmount > sales.totalRemainderMainCurrency) {
      paymentAmount = sales.totalRemainderMainCurrency;
      paymentInvoiceCurrency = sales.totalRemainder;
    }

    sales.totalRemainderMainCurrency -= paymentAmount;
    sales.totalRemainder -= paymentInvoiceCurrency;

    sales.payments.push({
      payment: paymentInFundCurrency || paymentAmount,
      paymentMainCurrency: paymentAmount,
      financialFunds: req.body.financailSource.name,
      paymentID: payment._id,
      financialFundsCurrencyCode: req.body.financailSource.code,
      exchangeRate: req.body.exchangeRate,
      date: req.body.date || formattedDate,
      paymentInInvoiceCurrency: paymentInvoiceCurrency,
      invoiceTotal: paymentInvoiceCurrency,
      financialFundsId: req.body.financailSource.id,
    });

    if (sales.totalRemainderMainCurrency <= 0.9) {
      sales.paymentsStatus = "paid";
    }

    const history = createInvoiceHistory(
      companyId,
      req.body.salesId,
      "payment",
      req.user._id,
      req.body.date,
      req.body.paymentInFundCurrency + " " + req.body.paymentCurrency,
      "invoice"
    );
    await sales.save();
    tes1t = {
      id: req.body.salesId,
      status: sales.paymentsStatus,
      paymentInFundCurrency: Number(req.body.paymentInFundCurrency),
      paymentInvoiceCurrency: Number(req.body.paymentInInvoiceCurrency),
      paymentMainCurrency: Number(req.body.totalMainCurrency),
      invoiceTotal: sales.invoiceGrandTotal,
      invoiceName: sales.invoiceName,
      invoiceCurrencyCode: sales.currency.currencyCode,
    };

    if (req.body.financailSource.type === "fund") {
      financialFunds.fundBalance += Number(req.body.paymentInFundCurrency);
    } else {
      await financailSource(
        req.body.financailSource.type,
        req.body.financailSource,
        companyId,
        req.body,
        next
      );
    }
    await createPaymentHistory(
      "payment",
      req.body.date,
      req.body.totalMainCurrency,
      req.body.paymentInFundCurrency,
      "customer",
      req.body.financailSource.id,
      sales.counter,
      companyId,
      description,
      payment.id,
      paymentType,
      "",
      req.body.financialFundsCurrencyCode
    );
  } else if (req.body.taker === "expense") {
    const suppler = await supplerModel.findOne({
      _id: req.body.supplierId || req.body.suppliersId,
      companyId,
    });
    const expense = await expensesModel.findOne({
      _id: req.body.expenseId,
      type: { $ne: "cancel" },
      companyId,
    });
    req.body.type = "expense";
    req.body.paymentText = "Withdrawal";

    payment = await paymentModel.create(req.body);
    let paymentAmount = req.body.paymentInMainCurrency;
    let paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    let paymentInFundCurrency = req.body.paymentInFundCurrency;
    if (paymentAmount > expense.totalRemainderMainCurrency) {
      paymentInFundCurrency;
      paymentAmount = expense.totalRemainderMainCurrency;
      paymentInvoiceCurrency = expense.totalRemainder;
    }
    expense.totalRemainderMainCurrency -= req.body.paymentInMainCurrency;
    expense.totalRemainder -= req.body.paymentInInvoiceCurrency;

    if (expense.totalRemainderMainCurrency <= 0.9) {
      expense.paymentStatus = "paid";
      expense.totalRemainderMainCurrency = 0;
      expense.totalRemainder = 0;
    }

    tes1t = {
      id: req.body.expenseId,
      status: expense.paymentStatus,
      invoiceNumber: expense._id,
      paymentInFundCurrency: Number(req.body.paymentInFundCurrency),
      paymentInvoiceCurrency: Number(req.body.paymentInInvoiceCurrency),
      paymentMainCurrency: Number(req.body.paymentInMainCurrency),
      invoiceTotal: expense.expenceTotal,
      invoiceName: expense.expenseName,
      invoiceCurrencyCode: expense.currency.currencyCode,
    };
    suppler.TotalUnpaid -= req.body.paymentInMainCurrency;

    financialFunds.fundBalance -= Number(req.body.paymentInFundCurrency);
    expense.payments.push({
      id: expense._id,
      payment: paymentInFundCurrency || paymentAmount,
      paymentMainCurrency: paymentAmount,
      financialFunds: req.body.financialFundsName,
      paymentID: payment._id,
      financialFundsCurrencyCode: req.body.currencyCode,
      exchangeRate: req.body.exchangeRate,
      date: req.body.date || formattedDate,
      paymentInInvoiceCurrency: paymentInvoiceCurrency,
      financialFundsId: financialFundsId,
    });
    await suppler.save();
    const history = createInvoiceHistory(
      companyId,
      expense._id,
      "payment",
      req.user._id,
      req.body.date,
      req.body.paymentInFundCurrency + " " + req.body.currencyCode,
      "invoice"
    );

    paymentText = "payment-sup";
    paymentType = "Withdrawal";

    await createPaymentHistory(
      "payment",
      req.body.date,
      req.body.paymentInMainCurrency,
      req.body.paymentInFundCurrency,
      "supplier",
      req.body.supplierId,
      expense.id,
      companyId,
      description,
      payment.id,
      "Deposit",
      "",
      req.body.financialFundsCurrencyCode
    );

    await expense.save();
  } else if (req.body.taker === "account") {
    payment = await paymentModel.create(req.body);
    if (req.body.isWithDraw === true) {
      financialFunds.fundBalance -=
        Number(req.body.totalMainCurrency) * req.body.exchangeRate;
      paymentText = "Withdrawal";
    } else {
      financialFunds.fundBalance +=
        Number(req.body.totalMainCurrency) * req.body.exchangeRate;
      paymentText = "Deposit";
    }
    paymentType = paymentText;
  } else if (req.body.taker === "salary") {
    const staff = await StaffModel.findOne({
      _id: req.body.staffId,
      companyId,
    });

    req.body.paymentText = "Withdrawal";
    req.body.type = "salary";
    payment = await paymentModel.create(req.body);
    await SalaryHistoryModel.create({
      employeeId: req.body.staffId,
      paidAmountMainCurreny: req.body.paymentInMainCurrency,
      paidAmount: req.body.paymentStaffCurrency,
      paidAmountFundCurrency: req.body.paymentInFundCurrency,
      paymentDate: req.body.date,
      transactionId: payment._id,
      salaryCurrency: req.body.currencyCode,
      desc: req.body.description,
      financialFundsId: req.body.financialFundsId,
      financialFunds: req.body.financialFundsName,
      financialFundsCurrencyCode: req.body.financialFundsCurrencyCode,
      companyId,
    });

    await createPaymentHistory(
      "payment",
      req.body.date || formattedDate,
      req.body.paymentInFundCurrency,
      0,
      "Salary",
      req.body.staffId,
      0,
      companyId,
      description,
      payment.id,
      req.body.paymentText,
      "",
      req.body.financialFundsCurrencyCode
    );
    paymentType = "Withdrawal";
    paymentText = "Salary";
    financialFunds.fundBalance -= Number(req.body.paymentInFundCurrency);
  } else if (req.body.taker === "refundSales") {
    const sales = await returnOrderModel.findOne({
      _id: req.body.refundSalesId,
      companyId,
    });
    req.body.type = "Refund sales";
    req.body.paymentText = "Withdrawal";
    req.body.paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    payment = await paymentModel.create(req.body);
    const customer = await customerModel.findOne({
      _id: req.body.customerId,
      companyId,
    });
    paymentText = "refund-sales";
    paymentType = "Withdrawal";

    let paymentAmount = req.body.totalMainCurrency;
    let paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    let paymentInFundCurrency = req.body.paymentInFundCurrency;
    customer.TotalUnpaid += req.body.totalMainCurrency;

    // await customer.save();
    if (paymentAmount > sales.totalRemainderMainCurrency) {
      paymentInFundCurrency;
      paymentAmount = sales.totalRemainderMainCurrency;
      paymentInvoiceCurrency = sales.totalRemainder;
    }

    sales.totalRemainderMainCurrency -= paymentAmount;
    sales.totalRemainder -= paymentInvoiceCurrency;

    sales.payments.push({
      payment: paymentInFundCurrency || paymentAmount,
      paymentMainCurrency: paymentAmount,
      financialFunds: req.body.financialFundsName,
      paymentID: payment._id,
      financialFundsCurrencyCode: req.body.paymentCurrency,
      exchangeRate: req.body.exchangeRate,
      date: req.body.date || formattedDate,
      paymentInInvoiceCurrency: paymentInvoiceCurrency,
      invoiceTotal: paymentInvoiceCurrency,
      financialFundsId: financialFundsId,
    });

    if (sales.totalRemainderMainCurrency <= 0.9) {
      sales.paymentsStatus = "paid";
    }

    const history = createInvoiceHistory(
      companyId,
      req.body.refundSalesId,
      "payment",
      req.user._id,
      req.body.date,
      req.body.paymentInFundCurrency + " " + req.body.paymentCurrency,
      "invoice"
    );
    await sales.save();
    tes1t = {
      id: req.body.refundSalesId,
      status: sales.paymentsStatus,
      paymentInFundCurrency: Number(req.body.paymentInFundCurrency),
      paymentInvoiceCurrency: Number(req.body.paymentInInvoiceCurrency),
      paymentMainCurrency: Number(req.body.totalMainCurrency),
      invoiceTotal: sales.invoiceGrandTotal,
      invoiceName: sales.invoiceName,
      invoiceCurrencyCode: sales.currency.currencyCode,
    };
    financialFunds.fundBalance -= Number(req.body.paymentInFundCurrency);

    await createPaymentHistory(
      "payment",
      req.body.date,
      req.body.totalMainCurrency,
      req.body.paymentInFundCurrency,
      "customer",
      "",
      sales.counter,
      companyId,
      description,
      payment.id,
      paymentType,
      "",
      req.body.financialFundsCurrencyCode
    );
  }

  // const payment = await paymentModel.create(req.body);
  if (req.body.taker !== "account" && req.body.taker !== "salary") {
    payment.payid = tes1t;
    await payment.save();
  }
  if (req.body?.financailSource?.type !== "fund" && req.body?.financailSource) {
    await createPaymentHistory(
      "payment",
      req.body.date,
      req.body.totalMainCurrency,
      req.body.paymentInFundCurrency,
      req.body?.financailSource.type,
      "",
      sales.counter,
      companyId,
      description,
      payment.id,
      paymentType,
      "",
      req.body.financialFundsCurrencyCode
    );
  } else {
    await financialFunds.save();
    await ReportsFinancialFundsModel.create({
      date: req.body.date || formattedDate,
      amount: req?.body?.total || req?.body?.paymentInFundCurrency,
      finalPriceMainCurrency: req?.body?.totalMainCurrency,
      ref: payment._id,
      type: paymentText,
      financialFundId: financialFundsId,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: req.body.exchangeRate || 1,
      description: req.body.description,
      paymentType: paymentType,
      payment: payment._id,
      companyId,
    });
  }

  if (!payment) {
    return next(new ApiError("Payment not created", 404));
  }

  res.status(200).json({ status: "success", data: payment });

  // Ensure this runs after sending the response
  setImmediate(async () => {
    await recalculateBalances(formattedDate, companyId);
  });
});

exports.getPayment = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const filters = req.query?.filters ? JSON.parse(req.query.filters) : {};

  const pageSize = parseInt(req.query.limit) || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { companyId };

  if (filters?.startDate || filters?.endDate) {
    query.startDate = {};
    if (filters.startDate) query.startDate.$gte = filters.startDate;
    if (filters.endDate) query.startDate.$lte = filters.endDate;
  }

  // Payment Status
  if (filters.paymentStatus) {
    query.status = filters.paymentStatus;
  }

  // Employee
  if (filters.employee) {
    query.employee = filters.employee;
  }

  // Tags
  if (filters?.tags?.length) {
    const tagIds = filters.tags.map((tag) => tag.id);
    query["tags.id"] = { $in: tagIds };
  }

  // Business Partner
  if (filters?.businessPartners) {
    query["customer.name"] = {
      $regex: filters.businessPartners,
      $options: "i",
    };
  }

  // Keyword Search
  if (req.query.keyword) {
    query.$or = [
      { counter: { $regex: req.query.keyword, $options: "i" } },
      { invoiceName: { $regex: req.query.keyword, $options: "i" } },
      { customerName: { $regex: req.query.keyword, $options: "i" } },
      { supplierName: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const payment = await paymentModel
    .find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(pageSize);
  const [quotations, totalItems] = await Promise.all([
    payment,
    paymentModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  if (!payment) {
    return next(new ApiError("Not found any Payment here", 404));
  }
  res.status(200).json({
    status: "success",
    totalPages: totalPages,
    results: quotations.length,
    data: quotations,
  });
});

exports.getOnePayment = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;

  let query = { companyId };

  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  if (isObjectId) {
    query = { _id: id };
  } else if (!isNaN(id)) {
    query = { counter: Number(id) };
  } else {
    query = { stringId: id };
  }

  const payment = await paymentModel.findOne(query);

  if (!payment) {
    return res
      .status(404)
      .json({ status: "fail", message: "Payment not found" });
  }

  res.status(200).json({ status: "success", data: payment });
});

exports.deletePayment = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const isObjectIdValid = mongoose.Types.ObjectId.isValid(id);

  // If it's a valid ObjectId, create the ObjectId instance for _id and counter comparison
  let objectId = null;
  if (isObjectIdValid) {
    objectId = new mongoose.Types.ObjectId(id);
  }

  // Now we proceed with deletion logic
  let payment;
  if (isObjectIdValid) {
    // Try to delete by _id or counter if ObjectId is valid
    payment = await paymentModel.findOneAndDelete({
      companyId,
      $or: [{ _id: objectId }],
    });
  } else {
    // If it's not a valid ObjectId, assume it's a string for counter
    payment = await paymentModel.findOneAndDelete({
      companyId,
      $or: [{ counter: id }],
    });
  }
  if (!payment) {
    return next(new ApiError(`No Payment with this id ${id}`));
  }
  if (
    payment.payid.length > 0 &&
    payment.supplierId &&
    payment.type === "purchase"
  ) {
    await supplerModel.findOneAndUpdate(
      { _id: payment.supplierId, companyId },
      {
        $inc: {
          TotalUnpaid: +payment.totalMainCurrency,
        },
      },
      { new: true }
    );

    payment.payid.map(async (purchaseId) => {
      if (!mongoose.Types.ObjectId.isValid(purchaseId.id)) {
        return;
      }

      const purchase = await PurchaseInvoicesModel.findOne({
        _id: purchaseId.id,
        companyId,
      });
      if (purchase) {
        purchase.paid = "unpaid";

        const removedPayments = purchase.payments.filter((item) => {
          if (item.paymentID.toString() === payment.id.toString()) {
            purchase.totalRemainderMainCurrency += item.paymentMainCurrency;
            purchase.totalRemainder += item.paymentInInvoiceCurrency;
            return false;
          }
          return true;
        });
        purchase.payments = removedPayments;

        await purchase.save();
      }
    });
  } else if (payment.payid.length > 0 && payment.customerId) {
    await customerModel.findOneAndUpdate(
      { _id: payment.customerId, companyId },
      {
        $inc: {
          TotalUnpaid: +payment.totalMainCurrency,
        },
      },
      { new: true }
    );

    payment.payid.map(async (salesId) => {
      if (!mongoose.Types.ObjectId.isValid(salesId.id)) {
        return;
      }
      const sales = await salesrModel.findById(salesId.id);

      if (sales) {
        sales.paymentsStatus = "unpaid";
        const removedPayments = sales.payments.filter((item) => {
          if (item.paymentID.toString() === payment.id.toString()) {
            sales.totalRemainderMainCurrency += item.paymentMainCurrency;
            sales.totalRemainder +=
              item.paymentInInvoiceCurrency || item.payment;
            return false;
          }
          return true;
        });

        sales.payments = removedPayments;
        await sales.save();
      }
    });
  } else if (
    payment.payid.length > 0 &&
    payment.supplierId &&
    payment.type === "expense"
  ) {
    await supplerModel.findOneAndUpdate(
      { _id: payment.supplierId, companyId },
      {
        $inc: {
          TotalUnpaid: +payment.totalMainCurrency,
        },
      },
      { new: true }
    );
    payment.payid.map(async (expenseId) => {
      if (!mongoose.Types.ObjectId.isValid(expenseId.id)) {
        return;
      }
      const expense = await expensesModel.findOne({
        _id: expenseId.id,
        companyId,
      });
      if (expense) {
        expense.paymentStatus = "unpaid";

        const removedPayments = expense.payments.filter((item) => {
          if (item.paymentID.toString() === payment.id.toString()) {
            expense.totalRemainderMainCurrency += item.paymentMainCurrency;
            expense.totalRemainder += item.paymentInInvoiceCurrency;
            return false;
          }
          return true;
        });
        expense.payments = removedPayments;

        await expense.save();
      }
    });
  } else if (
    payment.payid.length > 0 &&
    payment.supplierId &&
    payment.type === "refund purchase"
  ) {
    await supplerModel.findOneAndUpdate(
      { _id: payment.supplierId, companyId },
      {
        $inc: {
          TotalUnpaid: -payment.totalMainCurrency,
        },
      },
      { new: true }
    );

    payment.payid.map(async (purchaseId) => {
      if (!mongoose.Types.ObjectId.isValid(purchaseId.id)) {
        return;
      }

      const purchase = await RefundPurchaseInvoicesModel.findOne({
        _id: purchaseId.id,
        companyId,
      });
      if (purchase) {
        purchase.paid = "unpaid";

        const removedPayments = purchase.payments.filter((item) => {
          if (item.paymentID.toString() === payment.id.toString()) {
            purchase.totalRemainderMainCurrency += item.paymentMainCurrency;
            purchase.totalRemainder += item.paymentInInvoiceCurrency;
            return false;
          }
          return true;
        });
        purchase.payments = removedPayments;

        await purchase.save();
      }
    });
  } else if (payment.supplierId && payment.type === "supplier") {
    // Update supplier unpaid total
    await supplerModel.findOneAndUpdate(
      { _id: payment.supplierId, companyId },
      {
        $inc: {
          TotalUnpaid: +payment.totalMainCurrency,
        },
      },
      { new: true }
    );
    if (payment.payid.length > 0) {
      for (const item of payment.payid) {
        if (!mongoose.Types.ObjectId.isValid(item.id)) continue;

        if (item.invoiceType === "purchase") {
          const purchase = await PurchaseInvoicesModel.findOne({
            _id: item.id,
            companyId,
          });
          if (purchase) {
            purchase.paid = "unpaid";

            const filteredPayments = purchase.payments.filter((p) => {
              if (p.paymentID.toString() === payment.id.toString()) {
                purchase.totalRemainderMainCurrency += p.paymentMainCurrency;
                purchase.totalRemainder +=
                  p.paymentMainCurrency * purchase?.currency?.exchangeRate;
                return false; // Remove this payment
              }
              return true;
            });

            purchase.payments = filteredPayments;
            await purchase.save();
          }
        } else if (item.invoiceType === "expense") {
          const expense = await expensesModel.findOne({
            _id: item.id,
            companyId,
          });
          if (expense) {
            expense.paymentStatus = "unpaid";

            const filteredPayments = expense.payments.filter((p) => {
              if (p.paymentID.toString() === payment.id.toString()) {
                expense.totalRemainderMainCurrency += p.paymentMainCurrency;
                expense.totalRemainder +=
                  p.paymentMainCurrency * expense?.currency?.exchangeRate;
                return false;
              }
              return true;
            });

            expense.payments = filteredPayments;
            await expense.save();
          }
        }
      }
    }
  } else if (payment.staffId && payment.type === "salary") {
    await SalaryHistoryModel.findOneAndDelete({
      transactionId: id,
      companyId,
    });
  }

  if (payment) {
    try {
      if (payment.financailType === "supplier") {
        await supplerModel.findOneAndUpdate(
          { _id: payment.financialFundsId, companyId },
          { $inc: { TotalUnpaid: payment.paymentInFundCurrency } },
          { new: true }
        );
      } else if (payment.financailType === "customer") {
        await customerModel.findOneAndUpdate(
          { _id: payment.financialFundsId, companyId },
          { $inc: { TotalUnpaid: payment.paymentInFundCurrency } },
          { new: true }
        );
      } else if (payment.financailType === "account") {
        await accountingTree.findOneAndUpdate(
          { _id: payment.financialFundsId, companyId },
          { $inc: { debtor: -payment.paymentInFundCurrency } },
          { new: true }
        );
      } else {
        const reports = await ReportsFinancialFundsModel.findOne({
          payment: id,
          companyId,
        });

        if (reports.paymentType === "Withdrawal") {
          await FinancialFundsModel.findOneAndUpdate(
            { _id: reports.financialFundId, companyId },
            { $inc: { fundBalance: reports.amount } },
            { new: true }
          );
        } else {
          await FinancialFundsModel.findOneAndUpdate(
            { _id: reports.financialFundId, companyId },
            { $inc: { fundBalance: -reports.amount } },
            { new: true }
          );
        }

        await ReportsFinancialFundsModel.findOneAndDelete({ payment: id });
      }
      await paymentHistoryModel.deleteMany({
        idPaymet: payment.id,
        companyId,
      });
    } catch (e) {
      console.log(e);
    }
  }
  res.status(200).json({ message: "deleted", data: payment });
});

exports.deletePaymentTransferFund = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  const payment = await paymentModel.findOne({ _id: id, companyId });
  if (!payment) {
    return next(new ApiError(`no Payment: ${id}`, 404));
  }

  const fundReports = await ReportsFinancialFundsModel.find({
    ref: id,
    companyId,
  });

  if (!fundReports || fundReports.length < 2) {
    return next(new ApiError(`no Fund Reports`, 400));
  }

  const updates = fundReports.map((report) => {
    return FinancialFundsModel.findOneAndUpdate(
      { _id: report.financialFundId, companyId },
      {
        $inc: {
          fundBalance:
            report.type === "Withdrawal transfer"
              ? report.amount
              : -report.amount,
        },
      },
      { new: true }
    );
  });

  await Promise.all(updates);
  await ReportsFinancialFundsModel.deleteMany({ ref: id, companyId });

  await paymentModel.findOneAndDelete({ _id: id, companyId });

  res.status(200).json({ status: "success", data: payment });
});
