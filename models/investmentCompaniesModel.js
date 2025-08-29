const mongoose = require("mongoose");

const investmentCompaniesSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    description: String,
    industry: String,
    country: String,
    valuation: Number,
    sharePrice: Number,
    totalShares: Number,
    availableShares: Number,
    currency: String,
    expectedReturnRate: Number,
    dividendYield: Number,
    minInvestment: Number,
    fundingGoal: Number,
    fundingDeadline: String,
    investmentRound: String,
    investmentStartDate: String,
    logo: String,
    website: String,
    status: String,
    foundersArray: [
      {
        investorId: { type: mongoose.Schema.Types.ObjectId, ref: "investors" },
        shares: Number,
      },
    ],
    isFeatured: { type: Boolean, default: false },
    companyId: String,
  },
  { timestamps: true }
);

// Middleware to set image URL
const setImageURL = (doc) => {
  if (doc.logo) {
    doc.logo = `${process.env.BASE_URL}/investmentCompanies/${doc.logo}`;
  }
};

// Middleware to apply setImageURL on init and save
investmentCompaniesSchema.post("init", (doc) => {
  setImageURL(doc);
});

investmentCompaniesSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model(
  "investmentCompanies",
  investmentCompaniesSchema
);
