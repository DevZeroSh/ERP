const mongoose = require("mongoose");

const returnPurchaseInvicesSchema = new mongoose.Schema(
  {
    supplier: {
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
      linkAccount: String,
    },
    type: { type: String, default: "refund purchase" },
    invoicesItems: [
      {
        type: { type: String },
        qr: { type: String },
        name: { type: String },
        orginalBuyingPrice: { type: Number },
        tax: {
          _id: { type: mongoose.Schema.Types.ObjectId },
          tax: { type: Number },
        },
        stock: {
          _id: { type: mongoose.Schema.Types.ObjectId },
          stock: { type: String },
        },
        exchangeRate: { type: Number },
        quantity: { type: Number },
        discountType: { type: String },
        discountPercentege: { type: Number },
        discountAmount: { type: Number },
        discount: { type: Number },
        convertedBuyingPrice: { type: Number },
        totalWithoutTax: { type: Number },
        total: { type: Number },
        taxValue: { type: Number },
        profitRatio: { type: Number },
        showNote: Boolean,
        showDiscount: Boolean,
        unit: String,

        _id: false,
      },
    ],
    exchangeRate: Number,
    currency: {
      currencyCode: String,
      currencyName: String,
      currencyId: String,
      exchangeRate: Number,
      _id: String,
    },
    invoiceGrandTotal: Number,
    invoiceSubTotal: Number,
    invoiceDiscount: Number,
    ManualInvoiceDiscount: Number,
    invoiceTax: Number,
    taxDetails: [
      {
        taxRate: Number,
        totalTaxValue: Number,
        discountTaxValue: Number,
        _id: false,
      },
    ],
    invoiceName: String,

    financailFund: { value: String, label: String },
    paymentInFundCurrency: String,
    totalPurchasePrice: Number,
    totalPurchasePriceMainCurrency: Number,

    date: String,
    description: String,
    invoiceType: String,
    totalRemainderMainCurrency: { type: Number, default: 0 },
    totalRemainder: { type: Number, default: 0 },
    payments: [
      {
        payment: Number,
        paymentMainCurrency: Number,
        financialFunds: String,
        financialFundsId: String,
        financialFundsCurrencyCode: String,
        exchangeRate: String,
        date: String,
        paymentID: String,
        paymentInInvoiceCurrency: Number,
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
    InvoiceDiscountType: String,
    paid: {
      type: String,
      default: "unpaid",
    },
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    invoiceNumber: {
      type: String,
    },

    openingBalanceId: String,
    reportsBalanceId: String,
    journalCounter: String,

    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model(
  "refundpurchaseinvoices",
  returnPurchaseInvicesSchema
);
