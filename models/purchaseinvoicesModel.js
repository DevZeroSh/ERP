const mongoose = require("mongoose");

const PurchaseInvoicesSchema = new mongoose.Schema(
  {
    supllier: {
      id: String,
      name: String,
      supplierCompany: String,
      supplierEmail: String,
      phoneNumber: String,
      address: String,
    },
    type: { type: String, default: "normal" },
    invoicesItems: [
      {
        id: String,
        type: { type: String },
        qr: { type: String },
        name: { type: String },
        orginalBuyingPrice: { type: Number },
        tax: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Tax",
        },
        unit: String,
        stock: {
          _id: { type: mongoose.Schema.Types.ObjectId },
          stock: { type: String },
        },
        note: String,
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
        _id: false,
      },
    ],
    exchangeRate: Number,
    currency: {
      currencyCode: String,
      exchangeRate: Number,
      id: String,
      currencyName: String,
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
    tag: [
      {
        id: String,
        name: String,
        color: String,
        _id: false,
      },
    ],
    invoiceName: String,

    financailFund: { value: String, label: String },
    paymentInFundCurrency: String,
    totalPurchasePrice: Number,
    totalPurchasePriceMainCurrency: Number,
    ManualInvoiceDiscountValue: Number,
    date: String,
    description: String,
    invoiceType: String,
    dueDate: String,
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
    counter: String,
    InvoiceDiscountType: String,
    paid: {
      type: String,
      default: "unpaid",
      enum: ["paid", "unpaid"],
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
    file: String,
    paymentDate: String,
    receiptNumber: String,
    invoiceType: { type: String, default: "Purchase" },
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

//When findOne, findAll and update

module.exports = mongoose.model("PurchaseInvoices", PurchaseInvoicesSchema);
