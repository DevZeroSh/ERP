const mongoose = require("mongoose");

const investorSchema = new mongoose.Schema(
  {
    fullName: String,
    slug: { type: String, lowercase: true },
    phoneNumber: String,
    email: String,
    password: String,
    birthDate: String,
    ibanNumbers: { type: [String] },
    passportImage: String,
    idCardImage: String,
    profileImage: String,
    ownedShares: { type: Number, default: 0 },
    companyId: String,
  },
  { timestamps: true }
);
const setImageURL = (doc) => {
  if (doc.passportImage) {
    doc.passportImage = `${process.env.BASE_URL}/investor/${doc.passportImage}`;
  }
  if (doc.idCardImage) {
    doc.idCardImage = `${process.env.BASE_URL}/investor/${doc.idCardImage}`;
  }
  if (doc.profileImage) {
    doc.profileImage = `${process.env.BASE_URL}/investor/${doc.profileImage}`;
  }
};
// findOne, findAll and update
investorSchema.post("init", (doc) => {
  setImageURL(doc);
});

// create
investorSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model("investors", investorSchema);
