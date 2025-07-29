const mongoose = require("mongoose");

const stockTransferSchema = new mongoose.Schema(
  {
    fromStock: String,
    fromStockId: String,
    toStock: String,
    toStockId: String,
    date: String,
    sender: String,
    recipient: String,

    products: [
      {
        productId: String,
        productName: String,
        productQuantity: Number,
        productUnit: String,
        _id: false,
      },
    ],
    counter: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockTransfer", stockTransferSchema);
