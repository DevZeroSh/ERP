const mongoose = require("mongoose");

const AccountingTreeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    nameAr: { type: String, default: "" },
    nameTr: { type: String, default: "" },
    code: { type: String, required: true },

    accountType: { type: String },
    detailType: String,
    description: String,
    date: String,
    parentId: { type: String, default: null },
    parentCode: {
      type: String,
      default: null,
    },
    currency: {
      type: mongoose.Schema.ObjectId,
      ref: "Currency",
    },
    creditor: { type: Number, default: 0 },
    debtor: { type: Number, default: 0 },
    balanceType: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

AccountingTreeSchema.index({ code: 1 });
AccountingTreeSchema.index({ parentId: 1 });
AccountingTreeSchema.index({ accountType: 1 });
AccountingTreeSchema.index({ currency: 1 });

module.exports = mongoose.model("AccountingTree", AccountingTreeSchema);
