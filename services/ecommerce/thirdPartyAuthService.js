const asyncHandler = require("express-async-handler");
const thirdPartyModel = require("../../models/ecommerce/thirdPartyAuthModel");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");

// Get list of third party auths
exports.getAuths = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const thirdParties = await thirdPartyModel.find({ companyId });

  res.status(200).json({
    status: "success",
    results: thirdParties.length,
    data: thirdParties,
  });
});

// Get specific third party auth by ID
exports.getThirdPartyAuth = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const thirdPartyAuth = await thirdPartyModel.findOne({ _id: id, companyId });

  if (!thirdPartyAuth) {
    return next(new ApiError(`No third party auth found for id ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    data: thirdPartyAuth,
  });
});

// Update specific third party auth
exports.updateThirdPartyAuth = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;

  const thirdPartyAuth = await thirdPartyModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (!thirdPartyAuth) {
    return next(
      new ApiError(`No third party auth found for id ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    status: "success",
    message: "Third party auth updated",
    data: thirdPartyAuth,
  });
});
