const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const AssetModel = require("../models/assetCard");
const assetCategorySchema = require("../models/AssetCategoryModel");
const ApiError = require("../utils/apiError");
const finalAsset = require("../models/finalAssetModel");

// Get list of Assets
exports.getAssets = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = parseInt(req.query.limit) || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const keyword = req.query.keyword;

  const matchStage = keyword
    ? {
        $match: {
          $or: [
            { name: { $regex: keyword, $options: "i" } },
            { "category.name": { $regex: keyword, $options: "i" } },
          ],
        },
      }
    : {};

  const aggregationPipeline = [
    { $match: { companyId: companyId } },
    {
      $lookup: {
        from: "assetcategories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    ...(keyword ? [matchStage] : []),
    { $skip: skip },
    ...(pageSize ? [{ $limit: pageSize }] : []),
  ];

  const data = await AssetModel.aggregate(aggregationPipeline);

  const totalCountPipeline = [
    { $match: { companyId: companyId } },
    {
      $lookup: {
        from: "assetcategories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    ...(keyword ? [matchStage] : []),
    { $count: "total" },
  ];

  const countResult = await AssetModel.aggregate(totalCountPipeline);
  const totalItems = countResult[0]?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  res.status(200).json({
    status: "success",
    results: totalItems,
    totalPages: totalPages,
    data,
  });
});

// Create Asset
exports.createAsset = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;
  const asset = await AssetModel.create(req.body);

  res.status(201).json({
    status: "success",
    message: "Asset Inserted",
    data: asset,
  });
});

// Get specific Asset by id
exports.getAsset = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  // 1. Get the AssetCard
  const asset = await AssetModel.findByOne({
    _id: id,
    companyId: companyId,
  }).populate("category", "name depreciationMethod");

  if (!asset) {
    return next(new ApiError(`No AssetCard found for id ${id}`, 404));
  }

  // 2. Get all final assets that belong to this asset card
  const finalAssets = await finalAsset.find({
    assetCard: id,
    companyId: companyId,
  });

  // 3. Return both
  res.status(200).json({
    status: "success",
    data: {
      assetCard: asset,
      finalAssets: finalAssets,
    },
  });
});

// Update specific Asset
exports.updateAsset = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const asset = await AssetModel.findByOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  ).populate("category", "name");

  if (!asset) {
    return next(new ApiError(`No Asset found for id ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: "success",
    message: "Asset updated",
    data: asset,
  });
});

// Delete specific Asset
exports.deleteAsset = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const asset = await AssetModel.findByIdAndDelete({ _id: id, companyId });

  if (!asset) {
    return next(new ApiError(`No Asset found for id ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    message: "Asset Deleted",
  });
});
