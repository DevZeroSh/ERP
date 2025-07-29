const mongoose = require("mongoose");

const UnTracedproductLogSchema = new mongoose.Schema(
  {
    type: String,
    buyingPrice: Number,
    sellingPrice: Number,
    name: String,
    quantity: Number,
    desc: String,
    tax: { _id: String, tax: Number },
    totalWithoutTax: Number,
    total: Number,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("unTracedproductLog", UnTracedproductLogSchema);
