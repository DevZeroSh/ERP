const mongoose = require("mongoose");

const reportsFinancialFundsSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    fundNameform: String,

    fundNameto: String,

    amount: {
      type: Number,
      required: true,
    },
    amountToFund: {
      type: Number,
    },
    totalPriceAfterDiscount: { type: Number, default: 0 },
    totalPriceMainCurrence: {
      type: Number,
    },
    ref: String,
    archives: { type: Boolean, default: false },
    type: {
      type: String,
    },
    paymentType: String,
    financialFundId: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },
    payment: String,
    financialFundRest: Number,
    exchangeRate: Number,
    runningBalance: Number,
    description: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ReportsFinancialFunds",
  reportsFinancialFundsSchema
);
