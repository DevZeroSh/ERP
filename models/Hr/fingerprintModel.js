const mongoose = require("mongoose");

const fingerPrintSchema = new mongoose.Schema(
  {
    name: String,
    userID: String,
    email: String,
    Time: String,
    date: String,
    type: { type: String, enum: ["Check-in", "Check-out"], required: true },
        companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =  mongoose.model("FingerPrint", fingerPrintSchema);
