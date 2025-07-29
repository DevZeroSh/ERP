const mongoose = require("mongoose");

const customarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer Name Required"],
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,

      sparse: true,
    },
    email: {
      type: String,
      lowercase: true,
      sparse: true,
    },
    idNumber: {
      type: String,
      index: true,
    },
    iban: [
      {
        name: { type: String, trim: true },
        number: { type: String, trim: true },
        _id: false,
      },
    ],
    openingBalanceId: { type: String, index: true },
    openingBalance: { type: Number, default: 0 },
    openingBalanceExchangeRate: Number,
    openingBalanceCurrencyCode: String,
    sex: {
      type: String,
    },
    birthDate: { type: String, index: true },
    country: String,
    city: String,
    address: String,
    nickName: { type: String, trim: true },
    customarType: {
      type: String,
    },
    taxNumber: { type: String, index: true },
    taxAdministration: String,
    archives: { type: Boolean, default: false },
    date: { type: String, default: Date.now },
    total: { type: Number, default: 0 },
    TotalUnpaid: { type: Number, default: 0 },
    password: String,
    passwordResetCode: String,
    passwordResetExpires: String,
    resetCodeVerified: { type: Boolean, default: false },
    passwordChangedAt: String,
    passwordResetToken: String,
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
        index: true,
        _id: false,
      },
    ],
    addresses: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        alias: String,
        details: String,
        phone: String,
        city: String,
        town: String,
        firstName: String,
        lastName: String,
        _id: false,
      },
    ],
    uesrid: { type: String, index: true },
    linkAccount: { type: mongoose.Schema.ObjectId, ref: "AccountingTree" },
    tags: [
      {
        id: String,
        name: String,
        color: String,
        _id: false,
      },
    ],
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customar", customarSchema);
