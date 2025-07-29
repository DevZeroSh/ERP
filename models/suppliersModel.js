const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      require: [true, "supplier Name Required"],
    },
    idNumber: Number,
    nickName: String,
    phoneNumber: {
      type: String,
    },
    email: {
      type: String,
      lowercase: true,
    },
    openingBalanceId: String,
    openingBalance: Number,
    companyName: String,
    country: String,
    city: String,
    address: String,
    note: String,
    taxNumber: String,
    taxAdministration: String,
    date: String,
    archives: {
      type: String,
      enum: ["true", "false"],
      default: "false",
    },
    total: { type: Number, default: 0 },
    TotalUnpaid: { type: Number, default: 0 },
    supplierType: {
      type: String,
      enum: ["individual", "corporate"],
      default: "individual",
    },
    iban: [
      {
        name: String,
        number: String,
      },
    ],
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

module.exports = mongoose.model("Supplier", supplierSchema);
