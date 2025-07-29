const { default: mongoose } = require("mongoose");

const E_user_Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "user Name Required"],
      minlength: [3, "Too short customar name"],
      maxlength: [100, "Too long customar name"],
    },
    phoneNumber: {
      type: String,
    },
    email: {
      type: String,
      lowercase: true,
      require: [true, "user Email Required"],
    },
    idNumber: {
      type: Number,
      trim: true,
    },
    iban: [
      {
        name: String,
        number: String,
      },
    ],
    sex: {
      type: String,
      enum: ["male", "female", "unknown"],
      default: "unknown",
    },
    birthData: String,
    password: String,
    passwordResetCode: String,
    passwordResetExpires: String,
    resetCodeVerified: Boolean,
    passwordChangedAt: String,
    passwordResetToken: String,
    facebookId: String,
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
    addresses: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        alias: String,
        name: String,
        phone: String,
        city: String,
        town: String,
        details: String,
        isCommercial: String,
        taxNo: { type: String, default: "" },
        taxAdministration: { type: String, default: "" },
        companyName: { type: String, default: "" },
      },
    ],
    country: String,
    isCustomer: { type: Boolean, default: false },
    cards: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        card_num: String,
        card_holder_name: String,
        Expiration_date: String,
        cvv: String,
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

module.exports = mongoose.model("Users", E_user_Schema);
