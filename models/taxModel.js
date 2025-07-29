const mongoose = require("mongoose");

const TaxSchema = new mongoose.Schema({
  tax: Number,
  name: { type: String, },
  description: String,
  slug: {
    type: String,
    lowercase: true,
  },
  isDefault: { type: Boolean, default: false },
  salesAccountTax: { type: mongoose.Schema.ObjectId, ref: "AccountingTree" },
  purchaseAccountTax: { type: mongoose.Schema.ObjectId, ref: "AccountingTree" },
  sync: { type: Boolean, default: false },
  companyId: {
    type: String,
    required: true,
    index: true,
  },
});

module.exports = mongoose.model("Tax", TaxSchema);
