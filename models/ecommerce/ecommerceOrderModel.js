const mongoose = require("mongoose");

const ecommerceOrderSchema = new mongoose.Schema(
  {
    customar: {
      type: mongoose.Schema.ObjectId,
      ref: "Users",
      //required: [true, "Order must be belong to user"],
    },
    anonymousUser: {
      name: String,
      phoneNumber: String,
      idNumber: String,
      email: String,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        price: Number,
        taxPrice: {
          type: Number,
          default: 0,
        },
        name: String,
        qr: String,
        taxRate: Number,
        totalPriceAfterDiscount: Number,
        taxs: Number,
        statusUpdatedAt: { type: String, default: Date.now().toString() },
        desi: String,
        orderStatus: {
          type: String,
          enum: [
            "requested",
            "approved",
            "cancelled",
            "processed",
            "shipped",
            "delivered",
            "not delivered",
            "returned",
            "returnrequest",
            "cancelrequest",
          ],
          default: "requested",
        },
        tax: { taxId: String, taxRate: String },
        profitRatio: String,
        reviewId: {
          type: mongoose.Schema.ObjectId,
          ref: "Review",
        },
        _id: false,
      },
    ],
    date: String,
    shippingAddress: {
      alias: String,
      details: String,
      phone: String,
      email: String,
      city: String,
      town: String,
      fullName: String,
      phone: String,
      isCommercial: String,
      taxNo: { type: String, default: "" },
      taxAdministration: { type: String, default: "" },
      companyName: { type: String, default: "" },
    },
    billingAddress: {
      alias: String,
      details: String,
      phone: String,
      email: String,
      city: String,
      town: String,
      fullName: String,
      phone: String,
      isCommercial: String,
      taxNo: { type: String, default: "" },
      taxAdministration: { type: String, default: "" },
      companyName: { type: String, default: "" },
    },
    ipAddress: String,
    shippingPrice: {
      type: Number,
      default: 0,
    },
    totalDesi: Number,
    totalOrderPrice: {
      type: Number,
    },
    paymentMethodType: {
      type: String,
      enum: ["card", "cash", "transfer"],
      default: "cash",
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    paidAt: String,
    deliveredAt: String,
    orderNumber: String,
    invoiceCreated: {
      type: Boolean,
      default: false,
    },
    refNumber: {
      type: mongoose.Schema.ObjectId,
      ref: "sales",
    },
    token: {
      type: String,
      sparse: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EcommerceOrder", ecommerceOrderSchema);
