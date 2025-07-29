const asyncHandler = require("express-async-handler");
const productModel = require("../models/productModel");
const reconciliationModel = require("../models/stockReconciliationModel");
const { createProductMovement } = require("../utils/productMovement");


exports.checkStockReconciliation = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { stockid } = req.params;
  const reconciliation = await reconciliationModel.findOne({
    stockID: stockid,
    isClosed: false,
    companyId,
  });

  if (reconciliation) {
    return res.status(209).json({
      success: true,
      message: "You have an open reconciliation for this Stock",
      data: reconciliation,
      canReconcile: false,
    });
  }

  return res.status(200).json({ success: true, canReconcile: true });
});

// @desc    Create a new stock reconciliation
// @route   POST /api/stockReconciliation
// @access  Private
exports.createStockReconciliation = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  // Dealing with date and time START
  // To add 0 if the numeber is smaller than 10
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  // Breaking down the date-time
  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = padZero(date_ob.getDate());
  let month = padZero(date_ob.getMonth() + 1);
  let year = date_ob.getFullYear();
  let hours = padZero(date_ob.getHours());
  let minutes = padZero(date_ob.getMinutes());
  let seconds = padZero(date_ob.getSeconds());

  // Formatting the date and time
  const formattedDate =
    year +
    "-" +
    month +
    "-" +
    date +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;
  // Dealing with date and time END

  // Extract data from the request body
  const { stockID } = req.body;
  req.body.reconcilingDate = formattedDate;
  req.body.employee = req.user.name;
  // Create a new instance of the StockReconcil model
  const newStockReconcil = await reconciliationModel.create(req.body);

  const bulkOption2 = newStockReconcil.items
    .filter((item) => item.reconciled)
    .flatMap((item) => {
      const filterExisting = {
        qr: item.productBarcode,
        "stocks.stockId": stockID,
        companyId,
      };
      const updateExisting = {
        $set: {
          taxPrice: item.sellingPriceWithTax,
          price: item.sellingPrice,
          profitRatio: item.profitRatio,
          "stocks.$.productQuantity": item.realCount,
          "stocks.$.stockName": req.body.stockName,
        },
      };

      const filterMissing = {
        qr: item.productBarcode,
        "stocks.stockId": { $ne: stockID },
        companyId,
      };
      const updateMissing = {
        $set: {
          taxPrice: item.sellingPriceWithTax,
          price: item.sellingPrice,
          profitRatio: item.profitRatio,
        },
        $push: {
          stocks: {
            stockId: stockID,
            stockName: req.body.stockName,
            productQuantity: item.realCount,
          },
        },
      };

      return [
        {
          updateOne: {
            filter: filterExisting,
            update: updateExisting,
          },
        },
        {
          updateOne: {
            filter: filterMissing,
            update: updateMissing,
          },
        },
      ];
    });

  // Save the new stock reconciliation record to the database
  await productModel.bulkWrite(bulkOption2, {});
  await newStockReconcil.save();

  const reconciliationId = newStockReconcil._id;

  req.body.items.map(async (item) => {
    if (item.reconciled && item.makedReconciled) {
      try {
        for (const existingItem of req.body.items) {
          if (existingItem.productId === item.productId) {
            const product = await productModel.findOne({
              _id: item.productId,
              companyId,
            });

            if (product) {
              const totalStockQuantity = product.stocks.reduce(
                (total, stock) => total + stock.productQuantity,
                0
              );
              await createProductMovement(
                item.productId, //productId
                reconciliationId, //reference
                totalStockQuantity, //newQuantity
                item.difference, //quantity
                0, //newPrice
                0, //oldPrice
                "movement", //type
                "edit", //movementType
                "reconcile", //source
                companyId //dbName
              );
            } else {
              console.warn(`Product with ID ${item.productId} not found.`);
            }
          }
        }
      } catch (err) {
        console.log(err.message);
      }
    }
  });

  return res.status(201).json({ success: true, data: newStockReconcil });
});

// @desc    Get all reconciliation
// @route   GET /api/stockReconciliation
// @access  Private
exports.findAllReconciliations = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = req.query.limit || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { companyId };
  if (req.query.keyword) {
    query.$or = [
      { title: { $regex: req.query.keyword, $options: "i" } },
      { stockName: { $regex: req.query.keyword, $options: "i" } },
      { employee: { $regex: req.query.keyword, $options: "i" } },
    ];
  }
  const totalItems = await reconciliationModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);
  const mongooseQuery = reconciliationModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);
  const reconciliation = await mongooseQuery;
  if (!reconciliation) {
    return next(new ApiError(`Couldn't get the reports`, 404));
  }

  res.status(200).json({
    status: "true",
    results: reconciliation.length,
    data: reconciliation,
    Pages: totalPages,
  });
});

// @desc    Get one reconciliation report by ID
// @route   GET /api/stockReconciliation/:id
// @access  Private
exports.findReconciliationReport = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const reconciliation = await reconciliationModel
    .findOne({ _id: id, companyId })
    .sort({ createdAt: -1 });
  if (!reconciliation) {
    return next(
      new ApiError(`No reconciliation record for this id ${id}`, 404)
    );
  }
  res.status(200).json({ status: "true", data: reconciliation });
});

// @desc    Get one reconciliation report by ID
// @route   GET /api/stockReconciliation/:id/edit
// @access  Private
exports.updataOneReconciliationReport = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Retrieve the existing reconciliation report to compare previous data
  const existingReconcileReport = await reconciliationModel.findOne({
    _id: req.params.id,
    companyId,
  });
  if (!existingReconcileReport) {
    return next(
      new ApiError(
        `No reconciliation report found for id ${req.params.id}`,
        404
      )
    );
  }

  // Update the reconciliation report with the new data
  const reconcileReport = await reconciliationModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    { new: true }
  );

  if (!reconcileReport) {
    return next(
      new ApiError(`No reconcileReport found for id ${req.params.id}`, 404)
    );
  }

  // Perform bulk update for product quantities in the stock
  const bulkOption2 = reconcileReport.items
    .filter((item) => item.reconciled)
    .map((item) => ({
      updateOne: {
        filter: {
          qr: item.productBarcode,
          "stocks.stockId": reconcileReport.stockID,
          companyId,
        },
        update: {
          $set: {
            "stocks.$.productQuantity": item.realCount,
            price: item.sellingPrice,
            profitRatio: item.profitRatio,
            taxPrice: item.sellingPriceWithTax,
            makedReconciled: item.reconciled,
          },
        },
      },
    }));
  await productModel.bulkWrite(bulkOption2);

  // Calculate currency diffs for active products value update
  for (const item of req.body.items) {
    if (item.reconciled && !item.makedReconciled) {
      const product = await productModel.findById(item.productId);

      const totalStockQuantity = product.stocks.reduce(
        (total, stock) => total + stock.productQuantity,
        0
      );

      await createProductMovement(
        item.productId, //productId
        req.params.id, //reference
        totalStockQuantity,
        item.difference, //quantity
        0, //newPrice
        0, //oldPrice
        "movement", //type
        "edit", //movementType
        "reconcile", //source
        companyId //dbName
      );
    }
  }

  res.status(200).json({
    status: "success",
    message: "Reconciliation report updated",
    data: reconcileReport,
  });
});
