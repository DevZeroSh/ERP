const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
    index: true,
  },
  nameAR: {
    type: String,
  },
  nameTR: {
    type: String,
  },
  slug: { type: String, index: true },
  ecommerceVisible: { type: Boolean, default: false },
  ecommerceHomeVisible: { type: Boolean, default: false },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    index: true,
  },
  image: String,
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  profitRatio: Number,
  order: Number,
  sync: { type: Boolean, default: false },
  companyId: {
    type: String,
    required: true,
    index: true,
  },
});

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.IMG_BASE_URL}/category/${doc.image}`;
    doc.image = imageUrl;
  }
};
categorySchema.pre(/^find/, function (next) {
  this?.populate({ path: "children" });
  next();
});
categorySchema.post("init", function (doc) {
  if (Array.isArray(doc)) {
    doc.forEach(setImageURL);
  } else {
    setImageURL(doc);
  }
});
categorySchema.post("find", function (docs) {
  docs.forEach(setImageURL);
});
//Create
categorySchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model("Category", categorySchema);
