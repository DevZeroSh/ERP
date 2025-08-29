const mongoose = require("mongoose");

const profitAndLossSchema = new mongoose.Schema(
  {
    date: String,
    companyId: String,
    employee: String,
    account: [
      {
        name: String,
        accountType: String,
        amount: Number,
        balanceType: { type: String, enum: ["debit", "credit"] },
        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AccountingTree",
        },
        _id: false,
      },
    ],
    total: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("profitAndLoss", assetCardSchema);
