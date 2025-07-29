const mongoose = require("mongoose");
const { default: slugify } = require("slugify");

const assetCardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "assetCategory",
    },
    straightLineValue: {
      type: Number,
      min: 0,
    },
    decliningBalanceRate: {
      type: Number,
      min: 0,
      max: 100,
    },
    salvageValue: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["draft", "active", "retired"],
      default: "draft",
    },
    finalAsset: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "finalAsset",
      },
    ],
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

assetCardSchema.pre("save", function (next) {
  if (this.name && this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      locale: "en",
    });
  }
  next();
});

module.exports = mongoose.model("asset", assetCardSchema);;
