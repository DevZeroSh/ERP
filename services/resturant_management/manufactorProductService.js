const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const manufactorProductModel = require("../../models/resturant_management/manufatorProductModel");
const multer = require("multer");
const multerStorage = multer.memoryStorage();
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");

const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images Allowed", 400), false);
  }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadmanufactorProductImage = upload.single("image");

exports.resizermanufactorProductImage = asyncHandler(async (req, res, next) => {
  const filename = `manufator-Category-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("png")
      .png({ quality: 50 })
      .toFile(`uploads/manufatorProduct/${filename}`);

    //save image into our db
    req.body.image = filename;
  }

  next();
});

// @desc Create manufactorProduct
// @route POST /api/manufactorProduct
// @access Private
exports.createmanufactorProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const manufactorProductData = req.body;

  try {
    // Create manufactorProduct with the provided currency
    const manufactorProduct = await manufactorProductModel.create(
      manufactorProductData
    );

    // Respond with success message and created manufactorProduct data
    res.status(201).json({
      status: "true",
      message: "manufactorProduct inserted",
      data: manufactorProduct,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error creating manufactorProduct: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Get all manufactorProduct
// @route GET /api/manufactorProduct
// @access Private
exports.getAllmanufactorProducts = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  try {
    // Fetch all manufactorProducts
    const manufactorProducts = await manufactorProductModel.find({ companyId });

    // Respond with success message and data
    res.status(200).json({
      status: "true",
      message: "manufactorProducts fetched",
      data: manufactorProducts,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error fetching manufactorProducts: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Get one manufactorProduct
// @route GET /api/manufactorProduct
// @access Private
exports.getOnemanufactorProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  try {
    const manufactorProduct = await manufactorProductModel.findOne({
      _id: req.params.id,
      companyId,
    });

    if (!manufactorProduct) {
      return res.status(404).json({
        status: false,
        message: "manufactorProduct not found",
      });
    }

    res.status(200).json({
      status: "true",
      message: "manufactorProduct fetched",
      data: manufactorProduct,
    });
  } catch (error) {
    console.error(`Error fetching manufactorProduct: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Update manufactorProduct
// @route PUT /api/manufactorProduct/:id
// @access Private
exports.updatemanufactorProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const manufactorProductId = req.params.id;
  const updatedData = req.body;

  try {
    // Find and update the manufactorProduct
    const updatedmanufactorProduct =
      await manufactorProductModel.findOneAndUpdate(
        { _id: manufactorProductId, companyId },
        updatedData,
        { new: true, runValidators: true }
      );

    // If the manufactorProduct is not found
    if (!updatedmanufactorProduct) {
      return res.status(404).json({
        status: false,
        message: "manufactorProduct not found",
      });
    }

    // Respond with success message and updated data
    res.status(200).json({
      status: "true",
      message: "manufactorProduct updated",
      data: updatedmanufactorProduct,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error updating manufactorProduct: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
// @desc Delete manufactorProduct
// @route DELETE /api/manufactorProduct/:id
// @access Private
exports.deletemanufactorProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const manufactorProductId = req.params.id;

  try {
    // Find and delete the manufactorProduct
    const deletedmanufactorProduct =
      await manufactorProductModel.findOneAndDelete({
        _id: manufactorProductId,
        companyId,
      });

    // If the manufactorProduct is not found
    if (!deletedmanufactorProduct) {
      return res.status(404).json({
        status: false,
        message: "manufactorProduct not found",
      });
    }

    // Respond with success message
    res.status(200).json({
      status: "true",
      message: "manufactorProduct deleted",
    });
  } catch (error) {
    // Handle errors
    console.error(`Error deleting manufactorProduct: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
