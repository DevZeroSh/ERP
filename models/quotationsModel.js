const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    invoicesItems: [
      {
        type: { type: String, default: "product" },
        id: String,
        qr: String,
        name: String,
        category: String,
        orginalBuyingPrice: Number,
        profitRatio: Number,
        convertedBuyingPrice: Number,
        sellingPrice: Number,
        unit: String,
        tax: {
          _id: String,
          tax: Number,
          salesAccountTax: String,
          name: String,
        },
        taxValue: Number,
        soldQuantity: Number,
        totalWithoutTax: Number,
        total: Number,
        note: String,
        exchangeRate: Number,
        discountType: String,
        discountPercentege: Number,
        discountAmount: Number,
        discount: Number,
        showNote: Boolean,
        showDiscount: Boolean,
        buyingpriceMainCurrence: Number,
        _id: false,
      },
    ],
    customer: {
      id: String,
      name: String,
      phone: String,
      email: String,
      address: String,
      company: String,
      taxAdministration: String,
      taxNumber: String,
      country: String,
      city: String,
      _id: false,
    },
    currency: {
      id: String,
      currencyCode: String,
      exchangeRate: String,
      _id: false,
    },
    exchangeRate: { type: Number },
    invoiceGrandTotal: { type: Number },
    invoiceTax: { type: Number },
    invoiceSubTotal: Number,

    taxSummary: [
      {
        taxRate: Number,
        totalTaxValue: Number,
        discountTaxValue: Number,
        _id: false,
      },
    ],
    tag: [
      {
        id: String,
        name: String,
        color: String,
        _id: false,
      },
    ],
    totalInMainCurrency: { type: Number },

    InvoiceDiscountType: String,
    invoiceSubTotal: String,
    manuallInvoiceDiscount: Number,
    invoiceDiscount: Number,
    ManualInvoiceDiscountValue: Number,
    invoiceName: { type: String, default: "" },
    startDate: { type: String },
    endDate: { type: String },
    description: { type: String, default: "" },
    counter: { type: String, default: 0 },
    status: { type: String, default: "Draft" },
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotations", quotationSchema);
