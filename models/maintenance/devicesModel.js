const mongoose = require("mongoose");

const devicesSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "manitUser" },
    serialNumber: String,
    deviceType: String,
    deviceBrand: String,
    deviceModel: String,
    counter: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Device", devicesSchema);
