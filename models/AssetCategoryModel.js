const mongoose = require("mongoose");

const assetCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    depreciationMethod: {
      type: String,
      enum: ["Declining Balance", "Straight Line"],
      required: true,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("assetCategory", assetCategorySchema);
