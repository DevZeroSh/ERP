const mongoose = require("mongoose");

const manitenaceUserSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userPhone: String,
    userEmail: String,
    taxNumber: String,
    notes: String,
    address: String,
    city: String,
    taxAdminstration: String,
    isCompany: Boolean,
    counter: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("manitUser", manitenaceUserSchema);
