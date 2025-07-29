const mongoose = require("mongoose");

const manufatorProductSchema = new mongoose.Schema(
  {
    RecipeId: {
      type: mongoose.Schema.ObjectId,
      ref: "Recipe",
    },
    Productname: {
      type: String,
    },
    qr: {
      type: String,
    },
    brand: {
      type: mongoose.Schema.ObjectId,
      ref: "Brand",
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
    },
    label: {
      type: mongoose.Schema.ObjectId,
      ref: "Label",
    },
    image: String,
    unit: {
      type: mongoose.Schema.ObjectId,
      ref: "Unit",
    },
    tax: {
      type: mongoose.Schema.ObjectId,
      ref: "Tax",
    },
    recipeCost: {
      type: Number,
    },
    profitRatio: {
      type: String,
    },
    salePrice: {
      type: Number,
    },
    taxValue: {
      type: Number,
    },
    salePriceWithTax: {
      type: Number,
    },
    sync: { type: Boolean, default: false },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
  { collection: "manufatorProduct" }
);

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/manufatorProduct/${doc.image}`;
    doc.image = imageUrl;
  }
};

manufatorProductSchema.post("init", function (doc) {
  setImageURL(doc);
});

//Create
manufatorProductSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model("manufatorProduct", manufatorProductSchema);
