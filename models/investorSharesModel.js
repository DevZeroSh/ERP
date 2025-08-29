// models/ShareTransaction.js
const mongoose = require("mongoose");

const shareTransactionSchema = new mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "investors",
    },
    counterpartyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "investors",
    },
    type: String,
    shares: Number,
    sharePrice: Number,
    companyId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShareTransaction", shareTransactionSchema);
