const mongoose = require("mongoose");

const financialFundsSchema = new mongoose.Schema(
  {
    fundName: {
      type: String,
      required: true,
      minlength: [1, "The fund name is too short"],
      maxlength: [200, "The fund name is too long"],
    },
    BankName: {
      type: String,
      default: "",
    },
    BankBranch: {
      type: String,
      default: "",
    },
    AccountNumber: {
      type: String,
      default: "",
    },
    IBAN: {
      type: String,
      default: "",
    },
    fundCurrency: {
      type: mongoose.Schema.ObjectId,
      ref: "Currency",
    },
    fundBalance: {
      type: Number,
      default: 0,
    },

    description: String,

    bankRatio: {
      type: Number,
      default: 0,
    },

    linkAccount: { type: mongoose.Schema.ObjectId, ref: "AccountingTree" },
    type: String,
    code: { type: String },
    bank: String,
    bankBranch: String,
    accountNumber: String,
    iban: String,
    tags: [
      {
        id: String,
        name: String,
        color: String,
        _id: false,
      },
    ],
    journalCounter: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FinancialFunds", financialFundsSchema);
