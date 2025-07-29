const asyncHandler = require("express-async-handler");
const categoryModel = require("../models/CategoryModel");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const multer = require("multer");
const multerStorage = multer.memoryStorage();
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const xlsx = require("xlsx");
const productModel = require("../models/productModel");
const TaxSchema = require("../models/taxModel");
const { default: slugify } = require("slugify");

const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images Allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadCategoryImage = upload.single("image");

exports.resizerCategoryImage = asyncHandler(async (req, res, next) => {
  const filename = `category-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("png")
      .png({ quality: 60 })
      .toFile(`uploads/category/${filename}`);

    //save image into our db
    req.body.image = filename;
  }

  next();
});

//@desc Create  LastChildren
//@route Post /api/category/last-children
//@access Private
exports.getLastChildrenCategories = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const lastChildrenCategories = await categoryModel
      .find({
        children: { $size: 0 },
        companyId,
      })
      .lean();

    res.status(200).json({ status: true, data: lastChildrenCategories });
  } catch (error) {
    console.error("Error fetching last children categories:", error);
    next(error);
  }
});

//@desc Get List category
//@route Get /api/category/
//@access Private
exports.getCategories = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const categoryTree = await categoryModel.find({ companyId }).lean();

  res.status(200).json({ status: "true", data: categoryTree });
});

//@desc Create  category
//@route Post /api/category
//@access Private
exports.createCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  let parentProfitRate = null;
  req.body.slug = slugify(req.body.name);

  if (req.body.parentCategory) {
    const parentCategory = await categoryModel.findOne({
      _id: req.body.parentCategory,
      companyId,
    });

    if (!parentCategory) {
      return res.status(404).json({
        status: "false",
        message: "Parent category not found",
      });
    }

    parentProfitRate = parentCategory.profitRatio;
  } else {
    req.body.parentCategory = null;
  }

  req.body.profitRatio =
    req.body.profitRatio != 0 ? req.body.profitRatio : parentProfitRate;

  const category = await categoryModel.create(req.body);

  if (req.body.parentCategory) {
    await categoryModel.findOneAndUpdate(
      { _id: req.body.parentCategory, companyId },
      {
        $push: { children: category._id },
      }
    );
  }

  res.status(201).json({
    status: "true",
    message: "Category Inserted",
    data: category,
  });
});

//@desc Get specific category by id
//@route Get /api/category/:id
//@access Private
exports.getCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const category = await categoryModel.findOne({ _id: id, companyId });

  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: category });
});

//@desc Update category by id
//@route Put /api/category/:id
//@access Private
exports.updateCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const { id } = req.params;
  const oldCategory = await categoryModel.findOne({ _id: id, companyId });
  if (!oldCategory) {
    return next(new ApiError(`No Category found for ID: ${id}`, 404));
  }
  if (req.body.name) {
    req.body.slug = slugify(req.body.name);
  }
  // Update the category
  const category = await categoryModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }

  const { profitRatio } = req.body;
  const products = await productModel
    .find({ category: id, companyId })
    .populate({ path: "tax" });

  const bulkUpdates = products
    .filter((item) => item.profitRatio === oldCategory.profitRatio)
    .map((product) => {
      const originalPrice = product.buyingprice;
      const newProfit = (profitRatio / 100) * originalPrice;
      const newPrice = originalPrice + newProfit;
      const newPriceWithTax = newPrice + (product.tax.tax / 100) * newPrice;
      return {
        updateOne: {
          filter: {
            _id: product._id,
          },
          update: {
            profitRatio: profitRatio,
            price: newPrice,
            taxPrice: newPriceWithTax,
          },
        },
      };
    });

  if (bulkUpdates.length > 0) {
    await productModel.bulkWrite(bulkUpdates);
  }

  res
    .status(200)
    .json({ status: "true", message: "Category updated", data: category });
});

//@desc Delete specific category
//@route Delete /api/category/:id
//@access Private
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const category = await categoryModel.findOneAndDelete({ _id: id, companyId });
  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Category Deleted" });
});

//@desc post import category
//@route post /api/import
//@access Private

exports.importCategory = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Check if file is provided
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const { buffer } = req.file;
  let csvData;

  if (
    req.file.originalname.endsWith(".csv") ||
    req.file.mimetype === "text/csv"
  ) {
    csvData = await csvtojson().fromString(buffer.toString());
  } else if (
    req.file.originalname.endsWith(".xlsx") ||
    req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet_name_list = workbook.SheetNames;
    csvData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
  } else {
    return res.status(400).json({ error: "Unsupported file type" });
  }

  try {
    for (const category of csvData) {
      // Step 1: Insert the new category
      const newCategory = await categoryModel.create({
        name: category.name,
        nameAR: category.nameAR,
        nameTR: category.nameTR,
        image: category.image || null,
        parentCategory: category.parentCategory || null,
        companyId,
      });

      // Step 2: Find the parent category and update its children array
      if (category.parentCategory) {
        const parentCategory = await categoryModel.findOne({
          _id: category.parentCategory,
          companyId,
        });
        if (parentCategory) {
          parentCategory.children.push(newCategory._id);
          await parentCategory.save();
        } else {
          console.warn(
            `Parent category with ID ${category.parentCategory} not found.`
          );
        }
      }
    }

    res.status(200).json({
      status: "success",
      message: "Categories imported and structured successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      error: error.message,
    });
  }
});
