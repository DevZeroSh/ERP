const asyncHandler = require("express-async-handler");
const brandModel = require("../models/brandModel");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");
const mongoose = require("mongoose");
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

exports.uploadBrandImage = upload.single("image");

exports.resizerBrandImage = asyncHandler(async (req, res, next) => {
  const filename = `brand-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("png")
      .png({ quality: 50 })
      .toFile(`uploads/brand/${filename}`);

    //save image into our db
    req.body.image = filename;
  }

  next();
});
// Get list of Brands
exports.getBrands = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { companyId: companyId };
  if (req.query.keyword) {
    query.$or = [{ name: { $regex: req.query.keyword, $options: "i" } }];
  }
  const totalItems = await brandModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);
  const brands = await brandModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "success",
    totalPages: totalPages,
    results: brands.length,
    data: brands,
  });
});

// Create Brand
exports.createBrand = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;
  req.body.slug = slugify(req.body.name);
  const brand = await brandModel.create(req.body);
  res
    .status(201)
    .json({ status: "success", message: "Brand Inserted", data: brand });
});

// Get specific Brand by id
exports.getBrand = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const brand = await brandModel.findOne({ id, companyId });

  if (!brand) {
    return next(new ApiError(`No Brand found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: brand });
});

// Update specific Brand
exports.updataBrand = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const brand = await brandModel.findByIdAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!brand) {
    return next(new ApiError(`No Brand found for id ${req.params.id}`, 404));
  }
  res
    .status(200)
    .json({ status: "success", message: "Brand updated", data: brand });
});

// Delete specific Brand
exports.deleteBrand = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;
  const brand = await brandModel.findOneAndDelete({ _id: id, companyId });
  if (!brand) {
    return next(new ApiError(`No Brand found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", message: "Brand Deleted" });
});
