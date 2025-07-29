const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      sparse: true,
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: { type: Number, default: 1 },
        taxPrice: Number,
        name: String,
        qr: String,
        taxRate: Number,
        totalPriceAfterDiscount: Number,
        taxs: Number,
        price: Number,
        image: String,
        maxQuantity: Number,
        tax: { taxId: String, taxRate: String },
        profitRatio: String,
        _id: false,
      },
    ],
    coupon: String,
    totalCartPrice: Number,
    totalPriceAfterDiscount: Number,
    couponCount: String,
    couponType: String,

    customar: {
      type: mongoose.Schema.ObjectId,
      ref: "Customar",
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
