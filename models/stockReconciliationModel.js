const mongoose = require("mongoose");

const stockReconcilSchema = new mongoose.Schema(
  {
    title: String,
    reconcilingDate: String,
    items: [
      {
        productId: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        productBarcode: String,
        productName: String,
        recordCount: Number,
        realCount: Number,
        difference: Number,
        reconcilingReason: String,
        reconciled: Boolean,
        makedReconciled: { type: Boolean, default: false },
        buyingPrice: Number,
        exchangeRate: Number,
        lossValue: Number,
        profitRatio: Number,
        sellingPrice: Number,
        sellingPriceWithTax: Number,
        tax: Number,
        currencyCode: String,
        priceDiff: Number,
        currencyCode: String,
        oldSellingPrice: Number,
      },
    ],
    stockName: String,
    stockID: String,
    employee: String,
    isClosed: { type: Boolean, default: false },
    journalCounter: String,
    financialLossLink: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reconciliation", stockReconcilSchema);
