const mongoose = require("mongoose");

const currencySchema = new mongoose.Schema(
  {
    currencyCode: {
      type: String,
      require: [true, "Currency code is require"],
    },
    currencyName: {
      type: String,
      require: [true, "Currency name is require"],
     
    },
    currencyAbbr: {
      type: String,
      require: [true, "Currency abbreviation is required"],
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },
    buyingExchangeRate: { type: Number, default: 1 },
    is_primary: {
      type: String,
      default: "false",
  
    },
    thousandSeparator: String,
    decimalSeparator: String,
    decimals: String,
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Currency", currencySchema);
