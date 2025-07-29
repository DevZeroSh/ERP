const mongoose = require("mongoose");

const companyIfnoSchema = new mongoose.Schema({
  companyName: {
    type: String,
    minlength: [3, "Name is too short"],
  },
  companyAddress: String,
  companyTax: String,
  companyEmail: String,
  companyTel: String,
  companyLogo: {
    type: String,
    default: `defaultLogo.png`,
  },
  pinCode: { type: Number, default: 1234 },
  color: [String],
  havePin: {
    type: Boolean,
    enum: ["true", "false"],
    default: "false",
  },
  emails: { support: String, ecommerce: String, accounting: String },
  xtwitterUrl: String,
  linkedinUrl: String,
  instagramUrl: String,
  facebookUrl: String,
  prefix: {
    _id: false,
    sales: { type: String, default: "ABC" },
    salesRefund: { type: String, default: "ABC" },
    quotation: { type: String, default: "ABC" },
    expense: { type: String, default: "ABC" },
    purchase: { type: String, default: "ABC" },
    purchaseRefund: { type: String, default: "ABC" },
    purchaseRequest: { type: String, default: "ABC" },
    efatura: { type: String, default: "ABC" },
    receipts: { type: String, default: "ABC" },
  },
  sync: { type: Boolean, default: false },
});

const setImageURL = (doc) => {
  if (doc.companyLogo) {
    const imageUrl = `${process.env.BASE_URL}/companyinfo/${doc.companyLogo}`;
    doc.companyLogo = imageUrl;
  }
};

companyIfnoSchema.post("find", function (docs) {
  docs.forEach(setImageURL);
});

//Create
companyIfnoSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model("companyinfo", companyIfnoSchema);
