const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const rawMaterialModel = require("../../models/resturant_management/rawMaterialModel");

const { default: slugify } = require("slugify");
const categorySchema = require("../../models/CategoryModel");
const brandSchema = require("../../models/brandModel");
const UnitSchema = require("../../models/UnitsModel");
const currencySchema = require("../../models/currencyModel");
const TaxSchema = require("../../models/taxModel");

// @desc Create raw material
// @route POST /api/raw_material
// @access Private
exports.createRawMaterial = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const rawMaterialData = req.body;
  rawMaterialData.slug = slugify(rawMaterialData.name);
  req.body.companyId = companyId;
  try {
    // Create raw material with the provided currency
    const rawMaterial = await rawMaterialModel.create(rawMaterialData);

    // Respond with success message and created raw material data
    res.status(201).json({
      status: "true",
      message: "Raw material inserted",
      data: rawMaterial,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error creating raw material: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Get all raw materials
// @route GET /api/raw_material
// @access Private
exports.getAllRawMaterials = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = parseInt(req.query.limit);
  const page = parseInt(req.query.page);
  const skip = (page - 1) * pageSize;

  let query = { companyId };
  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const [totalItems, rawMaterials] = await Promise.all([
    rawMaterialModel.estimatedDocumentCount(),
    rawMaterialModel
      .find(query)
      .skip(skip)
      .limit(pageSize)
      .populate({ path: "category" })
      .populate({ path: "brand", select: "name _id" })
      .populate({ path: "unit", select: "name code _id" })
      .lean(),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  res.status(200).json({
    status: "true",
    message: "Raw materials fetched",
    Pages: totalPages,
    results: rawMaterials.length,
    data: rawMaterials,
  });
});

// @desc Get one raw material
// @route GET /api/raw_material
// @access Private
exports.getOneRawMaterial = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const rawMaterial = await rawMaterialModel
    .findOne({ _id: req.params.id })
    .populate({ path: "category" })
    .populate({ path: "brand", select: "name _id" })
    .populate({ path: "unit", select: "name code _id" })
    .populate({ path: "tax" })
    .populate({ path: "currency" })
    .lean();

  if (!rawMaterial) {
    return res.status(404).json({
      status: false,
      message: "Raw material not found",
    });
  }

  res.status(200).json({
    status: "true",
    message: "Raw material fetched",
    data: rawMaterial,
  });
});
// @desc Update raw material
// @route PUT /api/raw_material/:id
// @access Private
exports.updateRawMaterial = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const rawMaterialId = req.params.id;
  const updatedData = req.body;

  try {
    // Find and update the raw material
    const updatedRawMaterial = await rawMaterialModel.findOneAndUpdate(
      { _id: rawMaterialId, companyId },
      updatedData,
      { new: true, runValidators: true }
    );

    // If the raw material is not found
    if (!updatedRawMaterial) {
      return res.status(404).json({
        status: false,
        message: "Raw material not found",
      });
    }

    // Respond with success message and updated data
    res.status(200).json({
      status: "true",
      message: "Raw material updated",
      data: updatedRawMaterial,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error updating raw material: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Delete raw material
// @route DELETE /api/raw_material/:id
// @access Private
exports.deleteRawMaterial = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const rawMaterialId = req.params.id;

  try {
    // Find and delete the raw material
    const deletedRawMaterial = await rawMaterialModel.findOneAndDelete({
      _id: rawMaterialId,
      companyId,
    });

    // If the raw material is not found
    if (!deletedRawMaterial) {
      return res.status(404).json({
        status: false,
        message: "Raw material not found",
      });
    }

    // Respond with success message
    res.status(200).json({
      status: "true",
      message: "Raw material deleted",
    });
  } catch (error) {
    // Handle errors
    console.error(`Error deleting raw material: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
