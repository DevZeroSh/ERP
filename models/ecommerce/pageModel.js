const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    name: String,
    title: {
      type: String,
      required: true,
    },
    key: String,
    description: {
      type: String,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("page", pageSchema);
