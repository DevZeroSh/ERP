const mongoose = require("mongoose");

const positionsSchema = new mongoose.Schema(
  {
    name: String,
    nameAR: String,
    nameTR: String,
    description: String,
    parentPositions: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Positions",
      default: null,
    },
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Positions" }],
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Positions", positionsSchema);
