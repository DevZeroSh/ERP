const mongoose = require("mongoose");

const UnitSchema = new mongoose.Schema({
  name: { type: String, },
  slug: {
    type: String,
    lowercase: true,
  },
  description: String,
  nameAr: String,
  code: String,
  sync: { type: Boolean, default: false },
  companyId: {
    type: String,
    required: true,
    index: true,
  },
});

module.exports = mongoose.model("Unit", UnitSchema);
