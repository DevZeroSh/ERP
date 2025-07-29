const mongoose = require("mongoose");

const expensesSchema = new mongoose.Schema(
  {
    type: { type: String, default: "normal" },
    expenseName: String,
    date: String,
    expenseCategoryId: String,
    expenseCategory: String,
    dueDate: String,
    supllier: {
      id: String,
      name: String,
      supplierCompany: String,
      supplierEmail: String,
      phoneNumber: String,
      address: String,
    },

    expenceTotal: Number,
    expenceTotalMainCurrency: Number,

    receiptNumber: String,
    currency: {
      currencyCode: String,
      exchangeRate: Number,
      id: String,
      currencyName: String,
    },
    Tax: String,
    TaxId: String,
    totalRemainder: { type: Number, default: 0 },
    totalRemainderMainCurrency: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      default: "unpaid",
      enum: ["paid", "unpaid"],
    },
    paymentDate: String,
    financialFund: String,
    employeeID: String,
    employeeName: String,
    expenseClarification: String,
    paymentInFundCurrency: String,
    tag: [
      {
        id: String,
        name: String,
        color: String,
        _id: false,
      },
    ],
    journalCounter: String,
    expenseFile: String,

    payments: [
      {
        payment: Number,
        paymentMainCurrency: Number,
        financialFunds: String,
        financialFundsId: String,
        financialFundsCurrencyCode: String,
        exchangeRate: String,
        date: String,
        paymentID: String,
        paymentInInvoiceCurrency: Number,
        _id: false,
      },
    ],
    description: String,
    counter: String,
    paymentDisc: String,
    sync: { type: Boolean, default: false },
    mainCurrencyTax: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("expenses", expensesSchema);
