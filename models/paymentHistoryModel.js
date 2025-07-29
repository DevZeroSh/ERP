const mongoose = require("mongoose");

const PaymentHistorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
    },
    not: {
      type: String,
    },
    paymentText: String,
    date: {
      type: String,
    },
    rest: {
      type: Number,
    },
    amount: {
      type: Number,
    },
    customerId: {
      type: String,
    },
    supplierId: {
      type: String,
    },
    description: String,
    idPaymet: String,
    runningBalance: Number,
    ref: String,
    refText: String,
    sync: { type: Boolean, default: false },
    transactionCurrency: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("PaymentHistory", PaymentHistorySchema);
