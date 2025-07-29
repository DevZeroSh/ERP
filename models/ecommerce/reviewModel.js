const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    review: { type: String },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    customar: {
      type: mongoose.Schema.ObjectId,
      ref: "Users",
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
      required: true,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "customar",
    select: "name",
  });
  next();
});

module.exports = mongoose.model("Review", reviewSchema);
