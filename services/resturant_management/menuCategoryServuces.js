const menuCategoryModel = require("../../models/resturant_management/menuCategoryModel");
const ApiError = require("../../utils/apiError");
const { default: slugify } = require("slugify");
const mongoose = require("mongoose");
const multer = require("multer");
const multerStorage = multer.memoryStorage();
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const asyncHandler = require("express-async-handler");

const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images Allowed", 400), false);
  }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadMenuCategoryImage = upload.single("image");

exports.resizerMenuCategoryImage = asyncHandler(async (req, res, next) => {
  const filename = `menu-Category-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("png")
      .png({ quality: 50 })
      .toFile(`uploads/MenuCategory/${filename}`);

    //save image into our db
    req.body.image = filename;
  }

  next();
});

exports.getMenuCategories = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const menuCategory = await menuCategoryModel.find({ companyId });
  res
    .status(200)
    .json({ status: "true", results: menuCategory.length, data: menuCategory });
});

exports.createMenuCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;

  req.body.slug = slugify(req.body.name);
  const menuCategory = await menuCategoryModel.create(req.body);
  res.status(200).json({
    status: "true",
    message: "Menu Category Inserted",
    data: menuCategory,
  });
});

exports.getMenuCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const menuCategory = await menuCategoryModel.findOne({ _id: id, companyId });
  if (!menuCategory) {
    return next(new ApiError(`No Menu Category for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: menuCategory });
});

exports.updataMenuCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const menuCategory = await menuCategoryModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!menuCategory) {
    return next(
      new ApiError(`No Menu Category for this id ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    status: "true",
    message: "Menu Category updated",
    data: menuCategory,
  });
});

exports.deleteMenuCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const menuCategory = await menuCategoryModel.findOneAndDelete({
    _id: id,
    companyId,
  });
  if (!menuCategory) {
    return next(new ApiError(`No Menu Category for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Menu Category Deleted" });
});
