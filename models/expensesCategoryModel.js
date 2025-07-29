const mongoose = require("mongoose");

const expensesCategorySchama = new mongoose.Schema(
  {
    expenseCategoryName: {
      type: String,
      require: true,
    },
    expenseCategoryDescription: String,
    linkAccount: { type: mongoose.Schema.ObjectId, ref: "AccountingTree" },
    tag: [
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

module.exports = mongoose.model("ExpensesCategory", expensesCategorySchama);
