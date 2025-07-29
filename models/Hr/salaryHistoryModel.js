const mongoose = require("mongoose");

const SalaryHistorySchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.ObjectId, ref: "staff" },
    month: String,
    totalSalary: Number,
    paidAmount: Number,
    paidAmountMainCurreny: Number,
    paidAmountFundCurrency: Number,
    status: String,
    paymentDate: String,
    paymentMethod: String,
    transactionId: String,
    salaryCurrency: String,
    desc: String,
    financialFundsCurrencyCode: String,
    financialFunds: String,
    financialFundsId: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalaryHistory", SalaryHistorySchema);
