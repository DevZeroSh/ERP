const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    discountName: {
      type: String,
      require: [true, "Discount name is require"],
    },
    discountType: {
      type: String,
      enum: ["Currency", "Percentages"],
      default: ["Currency"],
      require: [true, "Discount type is require"],
    },
    quantity: {
      type: Number,
      require: [true, "Discount quantity is require"],
      minlength: [1, "The quantity number is too short"],
    },
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Discount", discountSchema);
