const mongoose = require("mongoose");

const soldReportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },
    date: {
      type: String,
      default: Date.now,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        sold: Number,
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

module.exports = mongoose.model("SoldReport", soldReportSchema);
