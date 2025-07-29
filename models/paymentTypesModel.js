const mongoose = require("mongoose");

const paymentTypesSchema = new mongoose.Schema(
  {
    paymentDescription: {
      type: String,
      default: "description",
    },
    paymentType: {
      type: String,
      require: [true, "You have to select one payment type"],
    },
    haveRatio: {
      type: String,
      enum: [true, false],
      default: false,
    },

    expenseCategory: {
      type: mongoose.Schema.ObjectId,
      ref: "ExpensesCategory",
    },
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentType", paymentTypesSchema);
