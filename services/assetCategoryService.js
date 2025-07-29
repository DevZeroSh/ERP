const asyncHandler = require("express-async-handler");
const AssetCategoryModel = require("../models/AssetCategoryModel");
const ApiError = require("../utils/apiError");

// Get list of Assets
exports.getAssetsCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const Assets = await AssetCategoryModel.find({ companyId });
  res
    .status(200)
    .json({ status: "success", results: Assets.length, data: Assets });
});

// Create Asset
exports.createAssetCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const Assets = await AssetCategoryModel.create(req.body);
  res.status(201).json({
    status: "success",
    message: "AssetCategory Inserted",
    data: Assets,
  });
});

// Get specific Asset by id
exports.getAssetCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const Asset = await AssetCategoryModel.findByOne({ _id: id, companyId });

  if (!Asset) {
    return next(new ApiError(`No AssetCategory found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: Asset });
});
