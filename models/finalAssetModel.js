const mongoose = require("mongoose");

const finalAsset = new mongoose.Schema(
  {
    assetCard: { type: mongoose.Schema.Types.ObjectId, ref: "asset" },
    serialNumber: String,
    price: Number,
    employee: String,
    purchaseDate: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("finalAsset", finalAsset);
