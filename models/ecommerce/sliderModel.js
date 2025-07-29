const { default: mongoose } = require("mongoose");

const silderSchema = new mongoose.Schema(
  {
    name: String,
    images: [String],
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const setImageURL = (doc) => {
  if (doc.images) {
    const imageList = [];
    doc.images.forEach((image) => {
      const imageUrl = `${process.env.BASE_URL}/sldier/${image}`;
      imageList.push(imageUrl);
    });
    doc.images = imageList;
  }
};
silderSchema.post("find", function (docs) {
  docs.forEach(setImageURL);
});

//Create
silderSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model("EcomeerceSlider", silderSchema);
