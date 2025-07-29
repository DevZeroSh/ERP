const mongoose = require("mongoose");

const footerSchema = new mongoose.Schema(
  {
    pageTitel: String,
    link: String,
    status: {
      type: String,
      enum: ["true", "false"],
      default: "true",
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("footer", footerSchema);
