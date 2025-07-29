const mongoose = require("mongoose");

const ecommercePaymentMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Payment method name is required"],
    },
    description: { type: String, default: "" },
    extraCharge: Number,
    companyRatio: Number,
    minAmount: Number,
    maxAmount: Number,
    status: Boolean,
    ibanNumber: { type: String, default: "" },
    ibanName: { type: String, default: "" },
    bankName: { type: String, default: "" },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ecommercePaymentMethods",
  ecommercePaymentMethodSchema
);
