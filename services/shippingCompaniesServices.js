const asyncHandler = require("express-async-handler");
const shippingCompaniesModel = require("../models/shippingCompaniesModel");
const ApiError = require("../utils/apiError");
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

exports.uploadShippingCompanyImage = upload.single("image");

exports.resizerShippingCompanyImage = asyncHandler(async (req, res, next) => {
  const filename = `shippingCompany-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("png")
      .png({ quality: 50 })
      .toFile(`uploads/shippingCompany/${filename}`);

    req.body.image = filename;
  }

  next();
});

// Get all shipping companies
exports.getShippingCompanies = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const shippingCompanies = await shippingCompaniesModel.find({ companyId });

  res.status(200).json({
    status: "success",
    results: shippingCompanies.length,
    data: shippingCompanies,
  });
});

// Create shipping company
exports.createShippingCompany = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const shippingCompany = await shippingCompaniesModel.create(req.body);

  res.status(201).json({
    status: "success",
    message: "Shipping company created",
    data: shippingCompany,
  });
});

// Get specific shipping company by ID
exports.getShippingCompany = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const shippingCompany = await shippingCompaniesModel.findOne({
    _id: id,
    companyId,
  });

  if (!shippingCompany) {
    return next(new ApiError(`No shipping company found for ID ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: shippingCompany });
});

// Update specific shipping company
exports.updateShippingCompany = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const id = req.params.id;

  let shippingCompany = await shippingCompaniesModel.findOne({
    _id: id,
    companyId,
  });
  if (!shippingCompany) {
    return next(new ApiError(`No shipping company found for ID ${id}`, 404));
  }

  if (req.body.name) shippingCompany.name = req.body.name;
  if (req.body.contractNumber)
    shippingCompany.contractNumber = req.body.contractNumber;
  if (req.body.status !== undefined) shippingCompany.status = req.body.status;

  if (req.body.prices) {
    shippingCompany.prices =
      typeof req.body.prices === "string"
        ? JSON.parse(req.body.prices)
        : req.body.prices;
  }

  if (req.body.image) {
    shippingCompany.image = req.body.image;
  }

  shippingCompany = await shippingCompany.save();

  res.status(200).json({
    status: "success",
    message: "Shipping company updated",
    data: shippingCompany,
  });
});

// Delete specific shipping company
exports.deleteShippingCompany = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const id = req.params.id;
  const shippingCompany = await shippingCompaniesModel.findOneAndDelete({
    _id: id,
    companyId,
  });

  if (!shippingCompany) {
    return next(new ApiError(`No shipping company found for ID ${id}`, 404));
  }

  res.status(200).json({
    status: "success",
    message: "Shipping company updated",
  });
});
