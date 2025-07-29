const mongoose = require("mongoose");

const ecommerceSettingsSchema = new mongoose.Schema(
  {
    page: [
      {
        name: String,
        title: String,
        key: String,
        description: String,
      },
    ],
    slider: [
      {
        name: String,
        images: [String],
      },
      { timestamps: true },
    ],
    contactUs: {
      email: String,
      phone: String,
      facebookUrl: String,
      instagramUrl: String,
      linkedinUrl: String,
      xtwitterUrl: String,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Function to set image URLs only for the slider
// const setImageURL = (sliderItem) => {
//   if (sliderItem.images && Array.isArray(sliderItem.images)) {
//     sliderItem.images = sliderItem.images.map(
//       (image) => `${process.env.BASE_URL}/slider/${image}`
//     );
//   }
// };

// // Apply setImageURL only for slider in post hooks
// ecommerceSettingsSchema.post("init", function (doc) {
//   if (doc.slider && Array.isArray(doc.slider)) {
//     doc.slider.forEach(setImageURL);
//   }
// });

// ecommerceSettingsSchema.post("save", (doc) => {
//   setImageURL(doc);
// });

module.exports = mongoose.model("ecommerceSettings", ecommerceSettingsSchema);
