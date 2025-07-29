const mongoose = require("mongoose");

const productQuestionsSchema = new mongoose.Schema(
  {
    question: { type: String },
    answer: { type: String, default: "" },
    customar: {
      type: mongoose.Schema.ObjectId,
      ref: "Users",
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: true,
    },
    approved: { type: Boolean, default: false },
    updateTime: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductQuestions", productQuestionsSchema);
