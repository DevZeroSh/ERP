const mongoose = require("mongoose");

const rawMaterialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    brand: {
      type: mongoose.Schema.ObjectId,
      ref: "brand",
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: mongoose.Schema.ObjectId,
      ref: "Unit",
    },
    currency: {
      type: mongoose.Schema.ObjectId,
      ref: "Currency",
    },
    tax: {
      type: mongoose.Schema.ObjectId,
      ref: "Tax",
    },
    alarm: { type: Number, default: 0 },
    description: {
      type: String,
    },
    quantity: Number,
    sold: {
      type: Number,
      default: 0,
    },
    calories: {
      type: Number,
      default: 0,
    },
    sync: { type: Boolean, default: false },
    lifeCycle: Number,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

rawMaterialSchema.index({ name: 1 });
rawMaterialSchema.index({ qr: 1 });
rawMaterialSchema.index({ category: 1 });
rawMaterialSchema.index({ brand: 1 });
rawMaterialSchema.index({ unit: 1 });
rawMaterialSchema.index({ currency: 1 });
rawMaterialSchema.index({ tax: 1 });
rawMaterialSchema.index({ name: "text", qr: "text" });

module.exports = mongoose.model("RawMaterial", rawMaterialSchema);
