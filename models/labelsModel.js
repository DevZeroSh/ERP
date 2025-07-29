const mongoose = require("mongoose");

const labelsSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
  },
  slug: {
    type: String,
    lowercase: true,
  },
  description: {
    type: String,
  },
  sync: { type: Boolean, default: false },
   companyId: {
      type: String,
      required: true,
      index: true,
    },
});


module.exports = mongoose.model("Labels", labelsSchema);
