const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    discountPercentage: {
      type: Number,
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    isActive: { type: Boolean, default: false },
    applicableProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    winProduct: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    soldCountToWin: Number,
    type: {
      type: String,
      enum: ["poss", "ecommerce", "oneProduct"],
      default: "poss",
    },
    imageTr: String,
    imageAr: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
