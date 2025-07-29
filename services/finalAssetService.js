const asyncHandler = require("express-async-handler");
const FinalAssetModel = require("../models/finalAssetModel");
const ApiError = require("../utils/apiError");
const AssetSchema = require("../models/assetCard");

// Get list of Assets
exports.getFinalAssets = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const Assets = await FinalAssetModel.find({ companyId }).populate(
    "assetCard"
  );
  res
    .status(200)
    .json({ status: "success", results: Assets.length, data: Assets });
});

// Create Asset
exports.createFinalAsset = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const Assets = await FinalAssetModel.create(req.body);
  res.status(201).json({
    status: "success",
    message: "FinalAsset Inserted",
    data: Assets,
  });
});

// Get specific Asset by id
exports.getFinalAsset = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const Asset = await FinalAssetModel.findOne({ _id: id, companyId }).populate(
    "assetCard"
  );

  if (!Asset) {
    return next(new ApiError(`No FinalAsset found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: Asset });
});

// Update Asset by ID
exports.updateFinalAsset = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const updatedAsset = await FinalAssetModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedAsset) {
    return next(new ApiError(`No FinalAsset found for id ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    message: "FinalAsset updated",
    data: updatedAsset,
  });
});
// Delete Asset by ID
exports.deleteFinalAsset = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const deletedAsset = await FinalAssetModel.findByIdAndDelete({
    _id: id,
    companyId,
  });

  if (!deletedAsset) {
    return next(new ApiError(`No FinalAsset found for id ${id}`, 404));
  }

  res.status(200).json({ status: "success", message: "FinalAsset deleted" });
});
