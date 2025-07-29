const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    invoicesItems: [
      {
        id: String,
        productId: { type: String },
        qr: String,
        name: String,
        orginalBuyingPrice: String,
        convertedBuyingPrice: String,
        tax: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tax",
        },
        taxValue: Number,
        quantity: Number,
        totalWithoutTax: Number,
        total: String,
        note: String,
        exchangeRate: Number,
        unit: String,
        showNote: Boolean,
        note: String,

        type: { type: String },
        _id: false,
      },
    ],
    currencyExchangeRate: Number,
    invoiceTax: Number,
    taxDetails: [
      {
        taxRate: Number,
        totalTaxValue: Number,
        discountTaxValue: Number,
        _id: false,
      },
    ],
    currency: {
      currencyCode: String,
      exchangeRate: Number,
      id: String,
      currencyName: String,
    },
    tag: [
      {
        id: String,
        name: String,
        color: String,
        _id: false,
      },
    ],
    invoiceGrandTotal: Number,
    registryDate: String,
    deliveryDate: String,
    admin: String,
    notes: String,
    description: String,
    invoiceName: String,
    status: { type: String, default: "Draft" },
    counter: { type: String, default: 0 },
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseRequest", purchaseRequestSchema);
