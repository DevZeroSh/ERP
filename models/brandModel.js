const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    index: true,
  },
  nameAR: {
    type: String,
  },
  nameTR: {
    type: String,
  },
  ecommerceVisible: {
    type: Boolean,
    default: true,
  },
  slug: {
    type: String,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
  },
  image: String,
  sync: { type: Boolean, default: false },
  companyId: {
    type: String,
    required: true,
    index: true,
  },
});
const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/brand/${doc.image}`;
    doc.image = imageUrl;
  }
};

brandSchema.post("init", function (doc) {
  if (Array.isArray(doc)) {
    doc.forEach(setImageURL);
  } else {
    setImageURL(doc);
  }
});

//Create
brandSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model("brand", brandSchema);
