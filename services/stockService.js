const asyncHandler = require("express-async-handler");

const { createProductMovement } = require("../utils/productMovement");
const StockModel = require("../models/stockModel");
const { default: slugify } = require("slugify");
const ApiError = require("../utils/apiError");
const productModel = require("../models/productModel");
const stockTransferModel = require("../models/stockTransfer");

exports.createStock = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  req.body.slug = slugify(req.body.name);
  const Stock = await StockModel.create(req.body);
  res.status(200).json({
    status: "success",
    message: "Stock created successfully",
    data: Stock,
  });
});

exports.getStocks = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  let query = { companyId };

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { location: { $regex: req.query.keyword, $options: "i" } },
    ];
  }
  const Stocks = await StockModel.find(query);
  res
    .status(200)
    .json({ statusbar: "success", results: Stocks.length, data: Stocks });
});

exports.getOneStock = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const stockId = req.params.id;
  const stock = await StockModel.findOne({ _id: stockId, companyId });

  if (!stock) {
    return next(new ApiError(`No stock found for id ${stockId}`, 404));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {
    "stocks.stockId": stockId,
    companyId,
  };

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalProducts = await productModel.countDocuments(query);
  const totalPages = Math.ceil(totalProducts / limit);
  const products = await productModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("unit")
    .populate("currency");

  const filteredProducts = products
    .map((product) => {
      const filteredStocks = product.stocks.filter(
        (stock) => stock.stockId.toString() === stockId
      );
      return {
        ...product._doc,
        stocks: filteredStocks,
      };
    })
    .filter((product) => product.stocks.length > 0);

  res.status(200).json({
    status: "success",
    results: filteredProducts.length,
    totalProducts,
    pages: totalPages,
    data: {
      stock: stock,
      products: filteredProducts,
    },
  });
});

exports.updateStock = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.slug = slugify(req.body.name);
  const Stock = await StockModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!Stock) {
    return next(new ApiError(`No Stock found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    data: Stock,
  });
});

exports.deleteStock = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const Stock = await StockModel.findOneAndDelete({
    _id: req.params.id,
    companyId,
  });
  if (!Stock) {
    return next(new ApiError(`No Stock found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    message: "Stock Delete successfully",
  });
});

// @desc put list product
// @route put /api/stock/transfer
// @access Private
exports.transformQuantity = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { fromStockId, toStockId, products } = req.body;

  // Fetch the stocks
  const stocks = await StockModel.find({
    _id: { $in: [fromStockId, toStockId] },
    companyId,
  });
  const fromStock = stocks.find(
    (stock) => stock._id.toString() === fromStockId
  );
  const toStock = stocks.find((stock) => stock._id.toString() === toStockId);

  if (!fromStock || !toStock) {
    return res.status(404).json({ message: "Stock not found" });
  }

  // Validate product quantities
  for (const product of products) {
    const quantity = parseInt(product.productQuantity, 10);
    if (quantity < 0) {
      return res
        .status(400)
        .json({ message: "Product quantity cannot be less than 0" });
    }
  }
  req.body.counter =
    (await stockTransferModel.countDocuments({ companyId })) + 1;
  // Create the stock transfer operation
  const transferStock = await stockTransferModel.create(req.body);
  const transferId = transferStock._id;

  // Update stock quantities in product model
  const bulkOps = [];
  for (const product of products) {
    const { productId, productQuantity } = product;
    const quantity = parseInt(productQuantity, 10);

    // Find the product and check if the stocks already contain fromStockId and toStockId
    const productDoc = await productModel.findById(productId);
    const fromStockExists = productDoc.stocks.some(
      (stock) => stock.stockId.toString() === fromStockId
    );
    const toStockExists = productDoc.stocks.some(
      (stock) => stock.stockId.toString() === toStockId
    );
    if (fromStockExists) {
      // Decrease quantity from the fromStock
      bulkOps.push({
        updateOne: {
          filter: { _id: productId, "stocks.stockId": fromStockId },
          update: { $inc: { "stocks.$.productQuantity": -quantity } },
        },
      });
    } else {
      return res.status(400).json({
        message: `Stock ID ${fromStockId} not found in product ${productId}`,
      });
    }
    if (toStockExists) {
      // Increase quantity to the toStock
      bulkOps.push({
        updateOne: {
          filter: { _id: productId, "stocks.stockId": toStockId },
          update: { $inc: { "stocks.$.productQuantity": quantity } },
        },
      });

      // Safely calculate the total quantity of the product (sum of all stocks)
      const totalProductQuantity = productDoc.stocks.reduce((sum, stock) => {
        const quantity = parseInt(stock.productQuantity, 10); // Ensure it's a number
        return sum + (isNaN(quantity) ? 0 : quantity); // Add only valid numbers
      }, 0);

      // Track the product movement to the destination stock
      await createProductMovement(
        productId, // productId
        transferId, // reference
        totalProductQuantity, // newQuantity
        quantity, // quantity
        0, // newPrice
        0, // oldPrice
        "movement", // type
        "in", // movementType
        "stockTransfer", // source
        companyId, // databaseName
        `${fromStock.name} -> ${toStock.name}` // desc
      );
    } else {
      // If the toStockId does not exist in stocks array, add it
      bulkOps.push({
        updateOne: {
          filter: { _id: productId, companyId },
          update: {
            $push: {
              stocks: {
                stockId: toStockId,
                stockName: toStock.name,
                productQuantity: quantity,
              },
            },
          },
        },
      });
    }
  }

  // Execute bulk update operations
  await productModel.bulkWrite(bulkOps);
  res.status(200).json({
    status: "success",
    message: "Transfer successful",
    data: transferStock,
  });
});

// @desc put list product
// @route put /api/stock/transfer
// @access Private

exports.getTransferStock = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { companyId };

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { date: { $regex: req.query.keyword, $options: "i" } },
    ];
  }
  const totalItems = await stockTransferModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const transfer = await stockTransferModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    statusbar: "success",
    results: transfer.length,
    Pages: totalPages,
    data: transfer,
  });
});

exports.getTransferForStock = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const { id } = req.params;

  let query = {
    $or: [{ toStockId: id }, { fromStockId: id }],
    companyId,
  };

  if (req.query.keyword) {
    query.$or = [
      { fromStock: { $regex: req.query.keyword, $options: "i" } },
      { toStock: { $regex: req.query.keyword, $options: "i" } },
      { sender: { $regex: req.query.keyword, $options: "i" } },
      { recipient: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await stockTransferModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);
  const transfer = await stockTransferModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    statusbar: "success",
    results: transfer.length,
    Pages: totalPages,
    data: transfer,
  });
});

exports.getAllStatementStock = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { companyId };

  if (req.query.keyword) {
    query.$or = [
      { fromStock: { $regex: req.query.keyword, $options: "i" } },
      { toStock: { $regex: req.query.keyword, $options: "i" } },
      { sender: { $regex: req.query.keyword, $options: "i" } },
      { recipient: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await stockTransferModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);
  const transfer = await stockTransferModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    statusbar: "success",
    results: transfer.length,
    Pages: totalPages,
    data: transfer,
  });
});

exports.getOneTransferStock = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const transfer = await stockTransferModel.findOne({ _id: id, companyId });

  res.status(200).json({ statusbar: "success", data: transfer });
});
