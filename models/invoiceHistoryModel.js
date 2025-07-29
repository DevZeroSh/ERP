const mongoose = require("mongoose");

const invoiceHistorySchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    historyType: {
      type: String,
      enum: ["create", "edit", "return", "cancel", "payment"],
      required: true,
    },
    from: String,
    employeeId: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    date: String,
    desc: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("invoiceHistory", invoiceHistorySchema);
