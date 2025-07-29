const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
    },
    supplierId: {
      type: String,
    },
    customerName: {
      type: String,
    },
    customerId: {
      type: String,
    },
    staffName: {
      type: String,
    },
    staffId: {
      type: String,
    },
    total: {
      type: Number,
      require: true,
    },
    totalMainCurrency: {
      type: Number,
      default: 0,
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },
    financialFundsCurrencyCode: String,
    data: String,
    ref: String,
    counter: {
      type: String,
      default: 0,
    },
    financialFundsName: String,
    financialFundsId: String,
    paymentInFundCurrency: String,
    payid: [
      {
        id: String,
        status: String,
        paymentInFundCurrency: Number,
        paymentMainCurrency: Number,
        paymentInvoiceCurrency: Number,
        invoiceTotal: String,
        invoiceName: String,
        invoiceCurrencyCode: String,
        invoiceType: String,
        _id: false,
      },
    ],
    financailType: String,
    paymentCurrency: String,
    type: String,
    date: String,
    description: String,
    journalCounter: String,
    paymentText: String,

    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
