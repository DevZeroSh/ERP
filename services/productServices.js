const asyncHandler = require("express-async-handler");
const productModel = require("../models/productModel");
const slugify = require("slugify");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const cron = require("node-cron");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const csvtojson = require("csvtojson");
const xlsx = require("xlsx");
const { default: mongoose } = require("mongoose");
const brandModel = require("../models/brandModel");
const categoryModel = require("../models/CategoryModel");
const UnitsModel = require("../models/UnitsModel");
const taxModel = require("../models/taxModel");
const currencyModel = require("../models/currencyModel");
const { createProductMovement } = require("../utils/productMovement");

const getAllChildCategories = require("../utils/CategoriesChild");

const { getParasutOneProduct } = require("./parasut/parasutServices");
const productMovementModel = require("../models/productMovementModel");

// @desc Get list product
// @route Get /api/product
// @access Public
exports.getAllProdcuts = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const product = await productModel
    .find({ companyId })
    .populate({
      path: "currency",
      select: "currencyCode currencyName exchangeRate is_primary  _id",
    })
    .populate({ path: "category" })
    .lean()
    .populate({ path: "brand", select: "name _id" })
    .populate({ path: "unit", select: "name code  _id" })
    .populate({ path: "tax" });

  res.status(200).json({
    status: "true",
    results: product.length,
    data: product,
  });
});

exports.updateNumber = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Step 1: Clear `productNo` for all products
  await productModel.updateMany({}, { $set: { productNo: 0 } });

  // Step 2: Fetch only products that have a valid `importDate` and sort them
  const products = await productModel
    .find({ importDate: { $ne: null }, companyId })
    .sort({ importDate: 1 });

  // Step 3: Assign a sequential number to each product
  for (let i = 0; i < products.length; i++) {
    products[i].productNo = i + 1; // Start numbering from 1
    console.log(
      `Updating product ${products[i]._id} with productNo ${products[i].productNo}`
    );
    await products[i].save(); // Save the updated product
  }

  res.status(200).json({
    status: "true",
    results: products.length,
    data: products,
  });
});

exports.getProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { companyId };

  if (req.query.keyword) {
    const lang = req.query.lang || "en";

    const nameField =
      lang === "tr" ? "nameTR" : lang === "ar" ? "nameAR" : "name";

    query.$or = [
      { [nameField]: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  if (req.query.type === "category" || req.query.type === "brand") {
    query.$and = [];
    if (req.query.type === "category") {
      query.$and.push({ category: req.query.id });
    }
    if (req.query.type === "brand") {
      query.$and.push({ brand: req.query.id });
    }
  }

  if (req.query.productType && req.query.productType !== "undefined") {
    query.type = req.query.productType;
  }

  if (req.query.label) {
    query.label = req.query.label;
  }

  let sortQuery = {};
  if (req.query.sold) {
    sortQuery = { sold: parseInt(req.query.sold) === 1 ? 1 : -1 };
  } else {
    sortQuery = { createdAt: -1 };
  }
  query.$and = query.$and || []; // Ensure $and exists

  if (req.query.archives === "true") {
    query.$and.push({ archives: "true" });
  } else {
    query.$and.push({ archives: "false" });
  }

  const totalItems = await productModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const product = await productModel
    .find(query)
    .sort(sortQuery)
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "category" })
    .lean()
    .populate({ path: "brand", select: "name _id" })
    .populate({ path: "variant", select: "variant  _id" })
    .populate({ path: "unit", select: "name code  _id" })
    .populate({ path: "tax" })
    .populate({ path: "label", select: "name  _id" })
    .populate({
      path: "currency",
      select: "currencyCode currencyName exchangeRate is_primary  _id",
    })
    .populate({
      path: "tax",
      populate: { path: "purchaseAccountTax" },
    })
    .populate({
      path: "tax",
      populate: {
        path: "purchaseAccountTax",
        populate: { path: "currency" },
      },
    })
    .populate({
      path: "tax",
      populate: { path: "salesAccountTax" },
    })
    .populate({
      path: "tax",
      populate: {
        path: "salesAccountTax",
        populate: { path: "currency" },
      },
    });

  res.status(200).json({
    status: "true",
    results: product.length,
    Pages: totalPages,
    data: product,
  });
});

exports.getProductPos = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const stockId = req.query.stockId;

  const pageSize = parseInt(req.query.limit, 10) || 25;
  const page = parseInt(req.query.page, 10) || 1;
  const skip = (page - 1) * pageSize;

  let query = {
    companyId,
    $or: [{ type: "Service" }, { "stocks.stockId": stockId }],
  };
  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  if (!stockId) {
    return res
      .status(400)
      .json({ status: "false", message: "Stock ID is required" });
  }

  if (req.query.label) {
    query.label = req.query.label;
  }

  let sortQuery = req.query.sold
    ? { sold: parseInt(req.query.sold, 10) === 1 ? 1 : -1 }
    : { createdAt: -1 };

  const [totalItems, products] = await Promise.all([
    productModel.countDocuments(query),
    productModel
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(pageSize)
      .populate({ path: "currency" })
      .populate({ path: "tax", select: "tax name _id  salesAccountTax" })
      .populate({ path: "unit" }),
  ]);

  const productsWithQuantity = products.map((product) => {
    const productObject = product.toObject();
    const stockEntry = product.stocks.find(
      (stock) => stock?.stockId?.toString() === stockId
    );
    productObject.activeCount = stockEntry ? stockEntry.productQuantity : 0;
    return productObject;
  });

  const totalPages = Math.ceil(totalItems / pageSize);
  res.status(200).json({
    status: "true",
    results: productsWithQuantity.length,
    pages: totalPages,
    data: productsWithQuantity,
  });
});

const multerOptions = () => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new ApiError("Only images Allowed", 400), false);
    }
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload;
};

const uploadMixOfImages = (arrayOfFilelds) =>
  multerOptions().fields(arrayOfFilelds);

exports.uploadProductImage = uploadMixOfImages([
  { name: "image", maxCount: 1 },
  { name: "imageCover", maxCount: 1 },
  { name: "imagesArray", maxCount: 5 },
]);

exports.resizerImage = asyncHandler(async (req, res, next) => {
  if (req.files.image) {
    const imageCoverFilename = `product-${uuidv4()}-${Date.now()}-cover.png`;

    await sharp(req.files.image[0].buffer)
      .toFormat("png")
      .png({ quality: 70 })
      .toFile(`uploads/product/${imageCoverFilename}`);

    //save image into our db
    req.body.image = imageCoverFilename;
  }
  if (req.files.imageCover) {
    const imageECoverFilename = `product-${uuidv4()}-${Date.now()}-cover.png`;

    await sharp(req.files.imageCover[0].buffer)
      .toFormat("png")
      .png({ quality: 70 })
      .toFile(`uploads/product/${imageECoverFilename}`);

    //save image into our db
    req.body.imageCover = imageECoverFilename;
  }
  let coverImageName = null;
  //-2 Images
  if (req.files.imagesArray) {
    req.body.imagesArray = [];

    // Initialize a variable to store the cover image
    let coverImageName = null;

    // Process the images
    await Promise.all(
      req.files.imagesArray.map(async (img, index) => {
        const imageName = `product-${uuidv4()}-${Date.now()}-${index + 1}.png`;

        await sharp(img.buffer)
          .toFormat("png")
          .png({ quality: 70 })
          .toFile(`uploads/product/${imageName}`);

        // Check if this image should be the cover image
        if (index === 0) {
          coverImageName = imageName; // Set the first image as the cover
        } else {
          // Save other images into the imagesArray
          req.body.imagesArray.push({
            image: imageName,
            isCover: false,
          });
        }
      })
    );

    // If there's a cover image, add it to the imagesArray
    if (coverImageName) {
      req.body.imagesArray.unshift({
        image: coverImageName,
        isCover: true, // Mark this image as the cover
      });
    }
  }
  next();
});

// @desc get Product for Ecommerces
// @route Post /api/productLazy
// @access public
exports.getLezyProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const limit = parseInt(req.query.limit) || 16;
  const skip = parseInt(req.query.skip) || 0;

  let query = {
    publish: true,
    ecommerceActive: true,
    companyId,
  };

  // Default sort query
  let sortQuery = { importDate: -1 };
  if (req.query.sold) {
    sortQuery = { sold: parseInt(req.query.sold) === 1 ? 1 : -1 };
  } else if (req.query.taxPrice) {
    sortQuery = {
      ecommercePriceMainCurrency: parseInt(req.query.taxPrice) === 1 ? 1 : -1,
    };
  } else if (req.query.ratingsAverage) {
    sortQuery = {
      ratingsAverage: parseInt(req.query.ratingsAverage) === 1 ? 1 : -1,
    };
  } else if (req.query.addToFavourites) {
    sortQuery = {
      addToFavourites: parseInt(req.query.addToFavourites) === 1 ? 1 : -1,
    };
  }

  // Keyword search
  if (req.query.keyword) {
    if (req.query.lang === "en") {
      query.name = { $regex: req.query.keyword, $options: "i" };
    } else if (req.query.lang === "tr") {
      query.nameTR = { $regex: req.query.keyword, $options: "i" };
    } else if (req.query.lang === "ar") {
      query.nameAR = { $regex: req.query.keyword, $options: "i" };
    }
  }

  // Function to get all active child category IDs recursively
  const getActiveChildCategories = async (categoryId) => {
    let categoryIds = [categoryId];
    const categories = await categoryModel
      .find({
        parentCategory: categoryId,
        ecommerceVisible: true,
      })
      .select("_id");

    for (const category of categories) {
      const childIds = await getActiveChildCategories(category._id);
      categoryIds = categoryIds.concat(childIds);
    }

    return categoryIds;
  };

  // Type filtering for category or brand
  if (req.query.type === "category" && req.query.id) {
    try {
      const categoryId = new mongoose.Types.ObjectId(req.query.id);
      const category = await categoryModel.findOne({
        _id: categoryId,
        ecommerceVisible: true,
      });
      if (!category) {
        return next(new Error("Category not found or not active"));
      }

      const categoryIds = await getActiveChildCategories(categoryId);
      query.category = {
        $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    } catch (error) {
      return next(new Error("Invalid category ID format"));
    }
  }
  if (req.query.type === "brand" && req.query.id) {
    try {
      query.brand = new mongoose.Types.ObjectId(req.query.id);
    } catch (error) {
      return next(new Error("Invalid brand ID format"));
    }
  }

  // Handle multiple brand IDs
  if (req.query.brandId) {
    let brandIds;
    if (Array.isArray(req.query.brandId)) {
      brandIds = req.query.brandId.map((id) => new mongoose.Types.ObjectId(id));
    } else if (typeof req.query.brandId === "string") {
      brandIds = req.query.brandId
        .split(",")
        .map((id) => new mongoose.Types.ObjectId(id));
    } else {
      return next(new Error("Invalid brand ID format"));
    }
    query.brand = { $in: brandIds };
  }

  // Ratings filter
  if (req.query.minAvg || req.query.maxAvg) {
    query.ratingsAverage = {};
    if (req.query.minAvg) {
      query.ratingsAverage.$gte = parseFloat(req.query.minAvg);
    }
    if (req.query.maxAvg) {
      query.ratingsAverage.$lte = parseFloat(req.query.maxAvg);
    }
  }

  // Construct the aggregation pipeline
  const aggregationPipeline = [
    {
      $addFields: {
        effectivePrice: {
          $cond: {
            if: { $gt: ["$ecommercePriceAftereDiscount", 0] },
            then: "$ecommercePriceAftereDiscount",
            else: "$ecommercePriceMainCurrency",
          },
        },
      },
    },
    {
      $lookup: {
        from: "currencies",
        localField: "currency",
        foreignField: "_id",
        as: "currencyDetails",
      },
    },
    {
      $unwind: {
        path: "$currencyDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        convertedPrice: {
          $multiply: ["$effectivePrice", "$currencyDetails.exchangeRate"],
        },
      },
    },
    {
      $match: {
        ...query,
        ...(req.query.taxPriceMin || req.query.taxPriceMax
          ? {
              ecommercePriceMainCurrency: {
                ...(req.query.taxPriceMin && {
                  $gte: parseFloat(req.query.taxPriceMin),
                }),
                ...(req.query.taxPriceMax && {
                  $lte: parseFloat(req.query.taxPriceMax),
                }),
              },
            }
          : {}),
      },
    },
    { $sort: sortQuery },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "brands",
        localField: "brand",
        foreignField: "_id",
        as: "brand",
      },
    },
    {
      $lookup: {
        from: "variants",
        localField: "variant",
        foreignField: "_id",
        as: "variant",
      },
    },
    {
      $lookup: {
        from: "taxes",
        localField: "tax",
        foreignField: "_id",
        as: "tax",
      },
    },
    {
      $lookup: {
        from: "currencies",
        localField: "currency",
        foreignField: "_id",
        as: "currency",
      },
    },
  ];

  try {
    const products = await productModel.aggregate(aggregationPipeline);

    const totalItems = await productModel.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const setImageURL = (doc) => {
      if (doc.image) {
        const imageUrl = `${process.env.BASE_URL}/product/${doc.image}`;
        doc.image = imageUrl;
      }
      if (doc.imagesArray) {
        const imageList = doc.imagesArray.map((imageObj) => {
          return {
            image: `${process.env.BASE_URL}/product/${imageObj.image}`,
          };
        });
        doc.imagesArray = imageList;
      }
    };

    products.forEach(setImageURL);

    res.status(200).json({
      status: "true",
      results: products.length,
      Pages: totalPages,
      data: products,
    });
  } catch (error) {
    next(error);
  }
});

// @desc update Stock product Quantity
const updateStocks = async (productId, stocks, quantity, productName) => {
  try {
    // Update stock information for each stock provided
    for (const stockInfo of stocks) {
      const { stockId, stockName, productQuantity } = stockInfo;
      // Skip updating or adding the product if productQuantity is 0
      if (productQuantity === 0) {
        console.log(
          `Skipping product ${productId} in stock ${stockId} due to quantity 0`
        );
        continue;
      }
    }
  } catch (error) {
    throw new Error(`Error updating stocks: ${error.message}`);
  }
};

// @desc Create  product
const createProductHandler = async (productData) => {
  try {
    // Connect to the appropriate database
    // Create a slug for the product name
    const product = await productModel.create(productData);

    return product;
  } catch (error) {
    throw new Error(`Error creating product: ${error.message}`);
  }
};

// @desc Create  product
// @route Post /api/product
// @access Private
exports.createProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const productData = req.body;

  productData.slug = slugify(productData.name);

  try {
    // Create product
    const product = await createProductHandler(productData);
    const findCureency = await currencyModel.findById({
      _id: req.body.currency,
    });

    // Update stocks with product ID
    if (productData.type !== "Service") {
      await createProductMovement(
        product._id,
        product._id,
        req.body.totalQuantity,
        req.body.totalQuantity,
        0,
        0,
        "movement",
        "in",
        "create",
        companyId
      );
    }

    await createProductMovement(
      product._id,
      product._id,
      0,
      0,
      product.buyingprice,
      product.buyingprice,
      "price",
      "in",
      "create",
      companyId,
      "",
      findCureency.currencyCode,
      findCureency.currencyCode
    );
    // Respond with success message and data
    res.status(201).json({
      status: "true",
      message: "Product Inserted",
      data: product,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error creating product: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Get specific product by id
// @route Get /api/product/:id
// @access Private
exports.getOneProduct = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const { id } = req.params;

    let query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id, companyId }
      : { slug: id, companyId };

    const pageSize = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const skip = (page - 1) * pageSize;
    // Fetch product and movements concurrently
    const product = await productModel
      .findOne(query)
      .populate({ path: "alternateProducts" })
      .populate({ path: "category", populate: { path: "parentCategory" } })
      .populate({ path: "brand", select: "name _id" })
      .populate({ path: "unit", select: "name code _id" })
      .populate({ path: "tax", select: "tax _id" })
      .populate({ path: "label", select: "name _id" })
      .populate({ path: "currency" })
      .populate({ path: "review", options: { limit: 10 } });

    const movements = await productMovementModel
      .find({
        productId: product._id,
        type: req.query.type,
        companyId,
      })
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    const totalMovements = await productMovementModel.countDocuments({
      productId: product._id,
      type: req.query.type,
      companyId,
    });
    const totalPages = Math.ceil(totalMovements / pageSize);

    // Check if product exists
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    // Fetch stock count from Parasut API
    if (product?.parasutID.length > 5) {
      const parasutProduct = await getParasutOneProduct(product?.parasutID);

      product.quantity = parasutProduct?.data?.attributes?.stock_count || 0;
    }
    const setImageURL = (doc) => {
      if (doc.image) {
        doc.image = `${process.env.BASE_URL}/product/${doc.image}`;
      }
      if (doc.imagesArray) {
        doc.imagesArray = doc.imagesArray.map((imageObj) => ({
          image: `${process.env.BASE_URL}/product/${imageObj.image}`,
        }));
      }
    };

    setImageURL(product);
    res
      .status(200)
      .json({ data: product, movements: movements, totalPages: totalPages });
  } catch (error) {
    next(error);
  }
});

// @desc Update the product to go in Ecommers
// @route put /api/ecommersproduct
// @access private
exports.updateEcommerceProducts = async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);

  try {
    const productIds = Array.isArray(req.body.productId)
      ? req.body.productId
      : [req.body.productId].filter(Boolean); // Filter out null/undefined

    const categoryId = Array.isArray(req.body.categoryId)
      ? req.body.categoryId
      : [req.body.categoryId].filter(Boolean);

    const brandId = Array.isArray(req.body.brandId)
      ? req.body.brandId
      : [req.body.brandId].filter(Boolean);

    // Step 1: Get the highest productNo
    const lastProduct = await productModel
      .find({ productNo: { $nin: [null, "", 0] } })
      .sort({ productNo: -1 })
      .limit(1);

    let lastProductNo = lastProduct.length
      ? parseInt(lastProduct[0].productNo, 10)
      : 0;

    let updatedProducts = [];

    if (categoryId.length || brandId.length) {
      let categoryFilter = [];
      if (categoryId.length) {
        categoryFilter = await getAllChildCategories(
          categoryId,
          db,
          categorySchema
        );
      }

      const filterConditions = [];
      if (categoryFilter.length)
        filterConditions.push({ category: { $in: categoryFilter } });
      if (brandId.length) filterConditions.push({ brand: { $in: brandId } });

      await productModel.updateMany({ $or: filterConditions }, [
        {
          $set: {
            ecommerceActive: true,
            importDate: new Date(),
            productNo: {
              $cond: {
                if: { $in: ["$productNo", [null, ""]] },
                then: { $toString: { $add: [lastProductNo, 1] } },
                else: "$productNo",
              },
            },
          },
        },
      ]);

      updatedProducts = await productModel.find({ $or: filterConditions });
    } else {
      updatedProducts = await Promise.all(
        productIds.map(async (productId) => {
          const product = await productModel.findById(productId);

          if (!product) {
            throw new Error(`Product with productId ${productId} not found.`);
          }

          if (!product.productNo) {
            product.productNo = (lastProductNo + 1).toString();
            lastProductNo++;
          }

          product.ecommerceActive = true;
          product.importDate = new Date();
          await product.save();

          return product;
        })
      );
    }

    res.status(200).json({ success: true, data: updatedProducts });
  } catch (error) {
    console.error("Error updating ecommerce products:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.updateEcommerceProductDeActive = asyncHandler(
  async (req, res, next) => {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    req.body.companyId = companyId;
    try {
      const { productId } = req.body;

      // Ensure productId is a string
      if (typeof productId !== "string") {
        return res.status(400).json({ error: "Invalid productId format" });
      }

      // Check if productId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: "Invalid productId" });
      }

      const updatedProduct = await productModel.findOneAndUpdate(
        { _id: productId, companyId },
        {
          ecommerceActive: false,
          publish: false,
          importDate: null,
        },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.status(200).json({ success: true, data: updatedProduct });
    } catch (error) {
      console.error("Error updating ecommerce products:", error.message);
      res.status(500).json({ error: "Server Error" });
    }
  }
);

// @desc Update the product to go in Ecommers
// @route put /api/ecommersproduct
// @access private
exports.setEcommerceProductPublish = async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  try {
    const id = req.body.id;
    const publish = req.body.publish;
    const product = await productModel.findOne({ _id: id, companyId });

    if (product.ecommercePrice <= 0) {
      const updatedProduct = await productModel.findOneAndUpdate(
        { _id: id, companyId },
        { publish: false }
      );
      return next(new ApiError("Please check the price of the product", 506));
    }
    // Await the findByIdAndUpdate operation
    const updatedProduct = await productModel.findOneAndUpdate(
      { _id: id, companyId },
      { publish: publish, slug: slugify(product.name) },
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

// @desc Update specific product
// @route Put /api/product/:id
// @access Private
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const productData = req.body;

  // Parse metas if provided
  if (req.body.metas) {
    try {
      req.body.metas = JSON.parse(req.body.metas);
    } catch (error) {
      console.error("Invalid metas format:", error);
      return next(new ApiError("Invalid metas format", 400));
    }
  }

  // Generate slug if name is provided
  if (req.body.name) {
    req.body.slug = slugify(req.body.name);
  }

  try {
    // Fetch existing product
    const existingProduct = await productModel
      .findOne({ _id: id, companyId })
      .populate("currency");

    if (!existingProduct) {
      console.error(`No Product found with ID: ${id}`);
      return next(new ApiError(`No Product for this id ${id}`, 404));
    }

    // Find currency if provided
    let findCurrency = null;
    if (req.body.currency) {
      findCurrency = await currencyModel.findOne({
        _id: req.body.currency,
        companyId,
      });
      if (!findCurrency) {
        console.error(`Currency not found with ID: ${req.body.currency}`);
      }
    }
    const totalQuantity = existingProduct?.stocks.reduce(
      (sum, stock) => sum + stock.productQuantity,

      0
    );

    // Check if quantity or price has changed
    const quantityChanged = totalQuantity !== req.body.totalQuantity;
    const priceChanged = existingProduct.buyingprice !== req.body.buyingprice;

    // Update product in the database
    const product = await productModel.findOneAndUpdate(
      { _id: id, companyId },
      req.body,
      {
        new: true,
      }
    );

    if (!product) {
      console.error(`Failed to update product with ID: ${id}`);
      return next(new ApiError(`No Product for this id ${id}`, 404));
    }

    let savedMovement;

    // Record product movement if quantity changed
    if (req.body.totalQuantity && quantityChanged) {
      savedMovement = await createProductMovement(
        id,
        id,
        totalQuantity + Number(req.body.totalQuantity) - Number(totalQuantity),
        Number(req.body.totalQuantity) - Number(totalQuantity),
        0,
        0,
        "movement",
        "edit",
        "update",
        companyId
      );
    }

    // Record product movement if buying price changed
    if (req.body.buyingprice && priceChanged) {
      savedMovement = await createProductMovement(
        id,
        id,
        0,
        0,
        req.body.buyingprice,
        existingProduct.buyingprice,
        "price",
        "edit",
        "update",
        companyId,
        "",
        findCurrency ? findCurrency.currencyCode : "N/A",
        existingProduct.currency ? existingProduct.currency.currencyCode : "N/A"
      );
    }

    // Update stocks if provided
    if (productData.stocks) {
      await updateStocks(
        id,
        productData.stocks,
        productData.quantity,
        productData.name
      );
    }

    res.status(200).json({
      status: "true",
      message: "Product updated",
      data: product,
      movement: savedMovement,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return next(new ApiError(`Error updating product: ${error.message}`, 500));
  }
});

// @desc Delete specific product
// @route Delete /api/product/:id
// @access Private
exports.archiveProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  // Find the product by ID
  const product = await productModel.findOne({ _id: id, companyId });

  if (!product) {
    return next(new ApiError(`No Product for this id ${id}`, 404));
  }
  try {
    product.archives = product.archives === "true" ? "false" : "true";

    // Update only the 'archives' field
    const updatedProduct = await productModel.findOneAndUpdate(
      { _id: id },
      { $set: { archives: product.archives } },
      { new: true }
    );

    const movementType = product.archives === "true" ? "out" : "in";

    const savedMovement = await createProductMovement(
      product._id,
      product._id,
      product.quantity,
      product.quantity,
      0,
      0,
      "movement",
      movementType,
      "archive",
      companyId
    );

    res.status(200).json({
      status: "success",
      message: "Product Archived",
      data: updatedProduct,
      movement: savedMovement,
    });
  } catch (error) {
    return new ApiError(`Error archiving product: ${error.message}`, 500);
  }
});

// @desc Get ecommerce products where ecommerceActive is true
// @route GET /api/product/importEcommerceProduct
// @access Private
exports.getEcommerceImportProduct = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  let query = { companyId };

  // Search by QR, Name, Product Number, or Category
  if (req.query.keyword) {
    const keywordRegex = new RegExp(req.query.keyword, "i");
    query.$or = [
      { name: { $regex: keywordRegex } },
      { qr: { $regex: keywordRegex } },
      { productNumber: { $regex: keywordRegex } },
    ];
  }

  // Filter by Published/Unpublished
  if (req.query.status) {
    query.ecommerceActive = req.query.status;
  }

  const pageSize = 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  const sortQuery = { updatedAt: -1 };

  // Count total matching products
  const totalItems = await productModel.countDocuments(query);

  // Fetch products with pagination and population
  const products = await productModel
    .find(query)
    .sort(sortQuery)
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "category", select: "name _id" })
    .populate({ path: "brand", select: "name _id" })
    .lean();

  const totalPages = Math.ceil(totalItems / pageSize);

  res.status(200).json({
    status: "success",
    results: products.length,
    totalItems: totalItems,
    pages: totalPages,
    data: products,
  });
});

// @desc Get Ecommerc Active Product
// @route GET /api/product/ecommerce-active-product
// @access private
exports.ecommerceActiveProudct = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = req.query.limit || 100;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let sortQuery = { importDate: -1 };
  let query = { ecommerceActive: true, companyId };

  if (req.query.category) {
    query.category = req.query.category;
  }

  if (req.query.publish) {
    const publishStatus = req.query.publish === "true";
    query.publish = publishStatus;
  }
  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  if (req.query.quantity) {
    sortQuery = { quantity: parseInt(req.query.quantity) === 1 ? 1 : -1 };
  }
  if (req.query.productNo) {
    sortQuery = { productNo: parseInt(req.query.productNo) === 1 ? 1 : -1 };
  }
  if (req.query.ecommercePrice) {
    sortQuery = {
      ecommercePrice: parseInt(req.query.ecommercePrice) === 1 ? 1 : -1,
    };
  }

  if (req.query.name) {
    sortQuery = {
      name: req.query.name == 1 ? 1 : -1,
    };
  }
  if (req.query.importDate) {
    sortQuery = {
      importDate: req.query.importDate == 1 ? 1 : -1,
    };
  }
  const totalItems = await productModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);
  const product = await productModel
    .find(query)
    .sort(sortQuery)
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "category" })
    .populate("unit")
    .populate("brand");

  res.status(200).json({
    status: "true",
    results: product.length,
    Pages: totalPages,
    data: product,
  });
});

// @desc Get Ecommerce dashboard stats
// @route GET /api/product/ecommerce-dashboard-stats
// @access private
exports.ecommerceDashboardStats = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const zeroQuantityCount = await productModel.countDocuments({
    quantity: 0,
    companyId,
  });

  const ecommerceActiveCount = await productModel.countDocuments({
    ecommerceActive: true,
    companyId,
  });

  const ecommerceInactiveCount = await productModel.countDocuments({
    ecommerceActive: true,
    publish: false,
    companyId,
  });

  const othersCount = await productModel.countDocuments({
    ecommerceActive: false,
    publish: false,
    companyId,
  });

  const publishedCount = await productModel.countDocuments({
    publish: true,
    companyId,
  });

  const totalOrderCount = await orderModel.countDocuments({ companyId });

  res.status(200).json({
    status: "true",
    zeroQuantityCount,
    ecommerceActiveCount,
    ecommerceInactiveCount,
    publishedCount,
    totalOrderCount,
    othersCount,
  });
});

// @desc Update the product to be featured
// @route PUT /api/featureProduct
// @access private
exports.setEcommerceProductFeatured = async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const { productIds, categoryId, brandId, featured = true } = req.body;

    let updatedProducts;

    if (categoryId) {
      // Fetch all child categories for the given categoryId
      const allCategories = await getAllChildCategories(
        categoryId,
        db,
        categorySchema
      );

      // Update products by category
      updatedProducts = await productModel.updateMany(
        { category: { $in: allCategories }, companyId },
        { $set: { featured } }
      );

      if (updatedProducts.matchedCount === 0) {
        console.log("No products found for the given category ID.");
      }
    } else if (brandId) {
      updatedProducts = await productModel.updateMany(
        { brand: { $in: brandId }, companyId },
        { $set: { featured } }
      );
    } else {
      // Update products matching the given productIds
      updatedProducts = await Promise.all(
        productIds.map(async (productId) => {
          const product = await productModel.findOneAndUpdate(
            { _id: productId, companyId },
            { featured },
            { new: true }
          );

          if (!product) {
            throw new Error(`Product with productId ${productId} not found.`);
          }

          return product;
        })
      );
    }

    res.status(200).json({ success: true, data: updatedProducts });
  } catch (error) {
    console.error("Error featuring product:", error.message);
    res.status(500).json({ error });
  }
};

// @desc Update the product to be featured
// @route GET /api/getFeatureProduct
// @access private
exports.getEcommerceProductFeatured = async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const product = await productModel
      .find({ featured: true, companyId })
      .populate({ path: "currency" });
    const setImageURL = (doc) => {
      if (doc.imagesArray) {
        const imageList = doc.imagesArray.map((imageObj) => {
          return {
            image: `${process.env.BASE_URL}/product/${imageObj.image}`,
          };
        });
        doc.imagesArray = imageList;
      }
    };

    product.forEach(setImageURL);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc Update the product to be sponsored
// @route PUT /api/sponsorProduct
// @access private
exports.setEcommerceProductSponsored = async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const { productIds, brandId, categoryId, sponsored = true } = req.body;
    let updatedProducts;

    if (categoryId) {
      // Fetch all child categories for the given categoryId
      const allCategories = await getAllChildCategories(
        categoryId,
        db,
        categorySchema
      );

      // Update products by category
      updatedProducts = await productModel.updateMany(
        { category: { $in: allCategories }, companyId },
        { $set: { sponsored } }
      );

      if (updatedProducts.matchedCount === 0) {
        console.log("No products found for the given category ID.");
      }
    } else if (brandId) {
      updatedProducts = await productModel.updateMany(
        { brand: { $in: brandId }, companyId },
        { $set: { sponsored } }
      );
    } else {
      // Update products matching the given productIds
      updatedProducts = await Promise.all(
        productIds.map(async (productId) => {
          const product = await productModel.findOneAndUpdate(
            { _id: productId, companyId },
            { sponsored },
            { new: true }
          );

          if (!product) {
            throw new Error(`Product with productId ${productId} not found.`);
          }

          return product;
        })
      );
    }

    res.status(200).json({ success: true, data: updatedProducts });
  } catch (error) {
    console.error("Error sponsoring product:", error.message);
    res.status(500).json({ error });
  }
};

// @desc Update the product to be sponsored
// @route GET /api/sponsorProduct
// @access private
exports.getEcommerceProductSponsored = async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const product = await productModel
      .find({ sponsored: true, companyId })
      .populate({ path: "currency" });
    const setImageURL = (doc) => {
      if (doc.imagesArray) {
        const imageList = doc.imagesArray.map((imageObj) => {
          return {
            image: `${process.env.BASE_URL}/product/${imageObj.image}`,
          };
        });
        doc.imagesArray = imageList;
      }
    };

    product.forEach(setImageURL);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc import products from Excel
// @route add /api/add
// @access Private
exports.addProduct = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const { buffer } = req.file;
    let csvData;

    // Check the file type based on the file extension or content type
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

    // let totalBuyingPrice = 0;
    for (const item of csvData) {
      // Find IDs for currency, category, unit, and brand
      const currency = await currencyModel.findOne({
        currencyName: item.currency,
      });
      const category = await categoryModel.findOne({ name: item.category });
      const unit = await UnitsModel.findOne({ name: item.unit });
      const brand = await brandModel.findOne({ name: item.brand });
      const tax = await taxModel.findOne({ tax: item.tax });

      const finalPrice = item.price;
      item.taxPrice = finalPrice;

      item.profitRatio = ((item.price - item.buyingprice) / item.price) * 100;

      // Handle stocks (e.g., Stock 1, Stock 2, etc.)
      const stocks = [];
      const excludedKeys = [
        "name",
        "qr",
        "tax",
        "buyingprice",
        "currency",
        "price",
        "category",
        "unit",
        "brand",
        "alarm",
        "taxPrice",
        "profitRatio",
        "description",
      ];
      for (const key of Object.keys(item)) {
        if (!excludedKeys.includes(key)) {
          const stockName = key;
          const stockQuantity = item[key] || 0; // Ensure it's always 0 if undefined or empty

          // Find the stock ID dynamically by stock name
          const stock = await stockModel.findOne({ name: stockName });

          if (stock) {
            stocks.push({
              stockId: stock._id,
              stockName: stock.name,
              productQuantity: stockQuantity,
            });
          } else {
            console.warn(`Stock with name "${stockName}" not found.`);
          }
        }
      }

      item.stocks = stocks;

      // Assign IDs
      item.currency = currency?._id;
      item.category = category?._id;
      item.unit = unit?._id;
      item.brand = brand?._id;
      item.tax = tax?._id;
      item.companyId = companyId;
    }

    // Save to MongoDB
    const duplicateQRs = [];
    try {
      const insertedProducts = await productModel.insertMany(csvData, {
        ordered: false,
      });
    } catch (error) {
      if (error.code === 11000) {
        error.writeErrors.forEach((writeError) => {
          const duplicateQR = writeError.err.op.qr;
          duplicateQRs.push(duplicateQR);
          console.log(`Duplicate QR: ${duplicateQR}`);
        });
      } else {
        throw error;
      }
    }

    res.json({ success: "Success", duplicateQRs });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// @desc Update products from Excel (for ecommerce)
// @route POST /api/product/importEcommerceProduct
// @access Private
exports.updateProductFromExcel = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  try {
    const { buffer } = req.file;
    let csvData;

    // Check the file type based on the file extension or content type
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

    for (const item of csvData) {
      const lastProduct = await productModel
        .find({ productNo: { $ne: 0 }, companyId })
        .sort({ productNo: -1 })
        .limit(1);

      let lastProductNo = lastProduct.length ? lastProduct[0].productNo : 0;

      const finalPrice = item.price + item.price * (item.tax / 100);
      item.taxPrice = finalPrice;
      const priceWithoutTax = item.price / (1 + item.tax / 100);

      item.profitRatio = ((item.price - item.buyingprice) / item.price) * 100;

      await productModel.findOneAndUpdate(
        { category: item.qr, companyId },
        {
          publish: true,
          slug: slugify(item.name),
          ecommerceActive: true,
          importDate: new Date(),
          category: item.category,
          productNo: lastProductNo + 1,
          profitRatio: item.profitRatio,
          buyingprice: item.buyingprice,
          price: priceWithoutTax,
          taxPrice: item.price,
          ecommercePrice: item.price,
          ecommercePriceMainCurrency: item.price,
        },
        {
          new: true,
        }
      );
    }
    res.json({ success: "Success" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

exports.getProductBySuppliers = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = parseInt(req.query.limit) || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  // Get the supplier ID from the URL path and convert it to an array
  const supplierIds = req.params.id ? [req.params.id] : null;

  const query = { companyId };

  // Apply the supplier filter only if supplierIds is not null
  if (supplierIds) {
    query.suppliers = { $in: supplierIds };
  }

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await productModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);

  const products = await productModel
    .find(query)
    .populate("currency")
    .populate("unit")
    .populate({ path: "tax" })
    .skip(skip)
    .limit(pageSize);

  res.json({
    status: "true",
    page,
    results: totalItems,
    Pages: totalPages,
    data: products,
  });
});

// const resetSold = asyncHandler(async (databaseName, field) => {
//   if (!["soldByMonth", "soldByWeek"].includes(field)) {
//     throw new Error("Invalid field to reset");
//   }

//   const db = mongoose.connection.useDb(databaseName);
//   const productModel = db.model("Product", productSchema);

//   try {
//     const result = await productModel.updateMany({}, { $set: { [field]: 0 } });
//     console.log(
//       `Reset ${field} for ${result.modifiedCount} products in ${databaseName}.`
//     );
//   } catch (error) {
//     console.error(`Error resetting ${field} in ${databaseName}:`, error);
//   }
// });

// const fetchAllSubscriberDatabases = async () => {
//   try {
//     console.log("Fetching subscriber databases...");

//     // Make a request to get all subscriber databases
//     const response = await axios.get(`${process.env.BASE_URL}/api/subscribers`);

//     if (response.data.status === "success") {
//       const subscriberDatabases = response.data.data.map((user) => user.dbName);
//       return subscriberDatabases;
//     } else {
//       throw new Error("Failed to fetch subscriber databases.");
//     }
//   } catch (error) {
//     console.error("Error fetching subscriber databases:", error);
//     return [];
//   }
// };

// const createSoldReport = asyncHandler(async (type, databaseName) => {
//   const db = mongoose.connection.useDb(databaseName);
//   const productModel = db.model("Product", productSchema);
//   const reportModel = db.model("SoldReport", soldReportSchema);

//   const soldField = type === "weekly" ? "soldByWeek" : "soldByMonth";

//   try {
//     const topProducts = await productModel
//       .find({ [soldField]: { $gt: 0 } })
//       .sort({ [soldField]: -1 })
//       .limit(10)
//       .select("name " + soldField);

//     const reportData = topProducts.map((product) => ({
//       productId: product._id,
//       name: product.name,
//       sold: product[soldField],
//     }));

//     const report = new reportModel({
//       type,
//       products: reportData,
//     });
//     await report.save();

//     await resetSold(databaseName, soldField);
//   } catch (error) {
//     console.error(`Error creating ${type} report for ${databaseName}:`, error);
//   }
// });

// Weekly task (every Sunday at 00:00)
// cron.schedule("0 0 * * 0", async () => {
//   //0 0 * * 0
//   console.log("Running weekly reports task for all databases...");
//   const subscriberDatabases = await fetchAllSubscriberDatabases();
//   for (const dbName of subscriberDatabases) {
//     await createSoldReport("weekly", dbName);
//     await resetSold(dbName, "soldByWeek");
//   }
// });

// Monthly task (1st of each month at 00:00)
// cron.schedule("0 0 1 * *", async () => {
//   //0 0 1 * *
//   console.log("Running monthly reports task for all databases...");
//   const subscriberDatabases = await fetchAllSubscriberDatabases();
//   for (const dbName of subscriberDatabases) {
//     await createSoldReport("monthly", dbName);
//     await resetSold(dbName, "soldByMonth");
//   }
// });

// This function was created to shorten Nahed's work because she doesn't want to do anything.
// Take this 1$ and don't tell her that I said this :)
exports.updateAllForNahed = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
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

    // Sort or process products to ensure consistent productNo assignment
    let productCounter = 1;

    // Keep track of updated QRs to avoid duplicates
    const updatedQRs = new Set();

    for (const item of csvData) {
      if (!item.qr || updatedQRs.has(item.qr)) continue;
      updatedQRs.add(item.qr);

      let basePrice = parseFloat(item.price);
      let baseBuyingPrice = parseFloat(item.buyingprice);
      let tax = parseFloat(item.tax);

      if (isNaN(basePrice) || basePrice <= 0) basePrice = 1;
      if (isNaN(baseBuyingPrice) || baseBuyingPrice <= 0) baseBuyingPrice = 1;
      if (isNaN(tax) || tax < 0) tax = 0;

      const priceWithTax = basePrice * (1 + tax / 100);
      const buyingPriceWithTax = baseBuyingPrice * (1 + tax / 100);

      const profitRatio =
        priceWithTax === 0
          ? 0
          : ((priceWithTax - buyingPriceWithTax) / priceWithTax) * 100;

      await productModel.findOneAndUpdate(
        { qr: item.qr, companyId },
        {
          productNo: productCounter,
          buyingprice: buyingPriceWithTax,
          price: basePrice,
          taxPrice: priceWithTax,
          ecommercePrice: priceWithTax,
          ecommercePriceMainCurrency: priceWithTax,
          profitRatio: profitRatio,
        },
        { new: true }
      );

      productCounter++;
    }
    console.log(`productCounter`, productCounter);
    res.json({ success: "Products updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});
