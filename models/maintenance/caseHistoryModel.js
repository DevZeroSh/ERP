const mongoose = require("mongoose");

const caseHitstorySchema = new mongoose.Schema(
  {
    devicsId: String,
    employeeName: String,
    date: String,
    histoyType: String,
    manitencesStatus: String,
    counter: String,
    companyId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("maintenacesHistory", caseHitstorySchema);
