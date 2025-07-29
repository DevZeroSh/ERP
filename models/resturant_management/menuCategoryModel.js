const mongoose = require("mongoose");

const menuCategorySchema = new mongoose.Schema({
  name: String,
  nameAR: String,
  nameTR: String,
  slug: { type: String },
  sync: { type: Boolean, default: false },
  image: String,
  companyId: {
    type: String,
    required: true,
    index: true,
  },
});
const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/MenuCategory/${doc.image}`;
    doc.image = imageUrl;
  }
};

menuCategorySchema.post("init", function (doc) {
  setImageURL(doc);
});

//Create
menuCategorySchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model("menuCategory", menuCategorySchema);
