const { default: mongoose } = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    name: String,
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: String,
      default: "Stock description",
    },
    location: String,
    posStock: { type: Boolean, default: false },
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stock", stockSchema);
