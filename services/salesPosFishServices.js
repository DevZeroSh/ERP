const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const productModel = require("../models/productModel");
const FinancialFundsModel = require("../models/financialFundsModel");
const ReportsFinancialFundsModel = require("../models/reportsFinancialFunds");
const emoloyeeShcema = require("../models/employeeModel");
const { createInvoiceHistory } = require("./invoiceHistoryService");
const { createProductMovement } = require("../utils/productMovement");
const currencySchema = require("../models/currencyModel");
const customersModel = require("../models/customarModel");

const posReceiptsModel = require("../models/orderModelFish");
const refundPosSales = require("../models/refundPosSales");
const orderModel = require("../models/orderModel");
const salsePointModel = require("../models/salesPointModel");
const { createPaymentHistory } = require("./paymentHistoryService");
const paymentModel = require("../models/paymentModel");
const createJournalForPos = require("../utils/creaeteJornalForPos");
const stockSchema = require("../models/stockModel");
const reportsFinancialFunds = require("../models/reportsFinancialFunds");
const salesPointModel = require("../models/salesPointModel");
const returnOrderModel = require("../models/returnOrderModel");

// @desc    Create cash order from the POS page
// @route   POST /api/salse-pos
// @access  privet/Pos Sales
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  req.body.employee = req.user.name;
  const padZero = (value) => (value < 10 ? `0${value}` : value);
  const ts = Date.now();
  const date_ob = new Date(ts);
  const date = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())}T${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}`;
  const cartItems = req.body.cartItems;
  req.body.date = date;

  const now = new Date();

  // نزود ثانية
  now.setSeconds(now.getSeconds() + 1);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dateParts = {};
  parts.forEach(({ type, value }) => {
    dateParts[type] = value;
  });

  const dateTurkey = `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;

  dateTurkey;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const { paymentInFundCurrency, salesPoint, financialFund } = req.body;
  req.body.employee = req.user.name;
  const stockID = req.body.stock;
  req.body.returnCartItem = req.body.cartItems;
  // Get next counter
  let nextCounter = 0;
  const nextCounterPayment =
    (await paymentModel.countDocuments({ companyId })) + 1;

  let order;
  await salsePointModel.findOneAndUpdate(
    { _id: salesPoint, companyId },
    {
      $inc: { sold: 1 },
    },
    { new: true }
  );
  if (req.body.customarId) {
    nextCounter = (await orderModel.countDocuments({ companyId })) + 1;
    req.body.counter = nextCounter;
    const customers = await customersModel.findOneAndUpdate(
      { _id: req.body.customarId, companyId },
      { $inc: { total: paymentInFundCurrency } },
      { new: true }
    );
    req.body.customer = {
      id: req.body.customarId,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      address: customers.address,
      company: customers.company,
      taxAdministration: customers.taxAdministration,
      taxNumber: customers.taxNumber,
      country: customers.country,
      city: customers.city,
    };
    req.body.cartItems.map((item) => {
      item.sellingPrice = item.sellingPriceBeforTax;
    });

    req.body.invoicesItems = req.body.cartItems;
    req.body.invoiceDiscount = req.body.invoiceDiscount;
    req.body.manuallInvoiceDiscountValue = req.body.manuallInvoiceDiscountValue;

    if (req.body.couponType === "") {
      req.body.manuallInvoiceDiscountValue = 0;
    }
    req.body.invoiceGrandTotal = parseFloat(req.body.invoiceGrandTotal);
    req.body.type = "sales-pos";
    req.body.invoiceSubTotal =
      parseFloat(req.body.invoiceSubTotal) +
      parseFloat(req.body.manuallInvoiceDiscountValue);
    order = await orderModel.create(req.body);
    await createPaymentHistory(
      "invoice",
      new Date().toISOString(),
      paymentInFundCurrency,
      customers.TotalUnpaid,
      "customer",
      req.body.customarId,
      nextCounter,
      companyId
    );
    await createPaymentHistory(
      "payment",
      new Date().toISOString(),
      paymentInFundCurrency,
      customers.TotalUnpaid,
      "customer",
      req.body.customarId,
      nextCounter,
      companyId,
      req.body.paymentDescription,
      nextCounterPayment
    );
    req.body.invoiceSubTotal =
      parseFloat(req.body.invoiceSubTotal) -
      parseFloat(req.body.manuallInvoiceDiscountValue);
  } else {
    nextCounter = (await posReceiptsModel.countDocuments({ companyId })) + 1;
    // Create order
    req.body.invoiceGrandTotal = parseFloat(req.body.invoiceGrandTotal);
    req.body.salesPoint = salesPoint;
    req.body.counter = nextCounter;

    order = await posReceiptsModel.create(req.body);
  }

  const financialFundsMap = {};
  const bulkUpdates = [];

  const fundsPromises = financialFund
    .filter((fund) => fund.allocatedAmount !== 0 && fund.allocatedAmount !== "")
    .map(async ({ fundId, allocatedAmount, exchangeRate }) => {
      const financialFund = await FinancialFundsModel.findOne({
        _id: fundId,
        companyId,
      });

      if (!financialFund) {
        return next(new ApiError(`Financial fund ${fundId} not found`, 404));
      }

      const updatedFundBalance =
        parseFloat(financialFund.fundBalance) +
        parseFloat(allocatedAmount || 0) -
        parseFloat(req.body.change || 0);

      bulkUpdates.push({
        updateOne: {
          filter: { _id: fundId, companyId },
          update: {
            $inc: {
              fundBalance:
                parseFloat(allocatedAmount) - parseFloat(req.body.change || 0),
            },
          },
        },
      });

      await ReportsFinancialFundsModel.create({
        date: date,
        amount: parseFloat(allocatedAmount || 0),
        exchangeAmount: req.body.totalInMainCurrency,
        ref: order._id,
        type: "POS-Receipts",
        financialFundId: fundId,
        financialFundRest: updatedFundBalance,
        exchangeRate,
        paymentType: "Deposit",
        payment: null,
        companyId,
      });
      if (req.body.change > 0) {
        await ReportsFinancialFundsModel.create({
          date: dateTurkey,
          amount: parseFloat(req.body.change || 0),
          exchangeAmount: req.body.change,
          ref: order._id,
          type: "POS-Remaining",
          financialFundId: fundId,
          financialFundRest: updatedFundBalance,
          exchangeRate,
          paymentType: "Withdrawal",
          payment: null,
          companyId,
        });
      }
      financialFundsMap[fundId] = financialFund;
    });

  await Promise.all(fundsPromises);

  if (bulkUpdates.length > 0) {
    await FinancialFundsModel.bulkWrite(bulkUpdates);
  }
  // Product movements
  cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });

    if (product && product.type !== "Service") {
      const stockEntryIndex = product.stocks.findIndex(
        (stock) => stock.stockId.toString() === stockID.toString()
      );
      if (stockEntryIndex !== -1) {
        // Update product model
        const updatedProduct = await productModel.findOneAndUpdate(
          {
            qr: item.qr,
            "stocks.stockId": stockID,
            companyId,
          },
          {
            $inc: {
              "stocks.$.productQuantity": -item.soldQuantity,
              sold: item.soldQuantity,
              soldByMonth: item.soldQuantity,
              soldByWeek: item.soldQuantity,
            },
          },
          { new: true }
        );
        const totalStockQuantity = updatedProduct.stocks.reduce(
          (total, stock) => total + stock.productQuantity,
          0
        );

        await createProductMovement(
          product._id,
          order.id,
          totalStockQuantity,
          item.soldQuantity,
          0,
          0,
          "movement",
          "out",
          "sales",
          companyId
        );
      }
    }
  });

  // Wait for all promises to resolve

  // Save financial funds and respond
  // await financialFunds.save();
  const history = createInvoiceHistory(
    companyId,
    order._id,
    "create",
    req.user._id,
    new Date().toISOString()
  );
  res.status(201).json({ status: "success", data: order, history });
});

/*
// @desc    create cash order for multiple funds
// @route   POST /api/salse-pos/funds
// @access  privet/User
// exports.createCashOrderMultipelFunds = asyncHandler(async (req, res, next) => {
//   const dbName = req.query.databaseName;
//   const db = mongoose.connection.useDb(dbName);
//   const salsePointModel = db.model("salesPoints", SalesPointSchema);

//   const salsePos = db.model("posReceipts", orderFishSchema);
//   const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
//   const ReportsFinancialFundsModel = db.model(
//     "ReportsFinancialFunds",
//     reportsFinancialFundsSchema
//   );
//   const orderModel = db.model("Sales", orderSchema);

//   const expensesModel = db.model("Expenses", expensesSchema);
//   const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
//   const productModel = db.model("Product", productSchema);
//   const stockID = req.body.stock;
//   db.model("Currency", currencySchema);
//   const padZero = (value) => (value < 10 ? `0${value}` : value);
//   const ts = Date.now();
//   const date_ob = new Date(ts);
//   const date = `${date_ob.getFullYear()}-${padZero(
//     date_ob.getMonth() + 1
//   )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
//     date_ob.getMinutes()
//   )}:${padZero(date_ob.getSeconds())}`;
//   const timeIsoString = new Date().toISOString();

//   const { cartItems, financialFund } = req.body;

//   if (!cartItems || cartItems.length === 0) {
//     return next(new ApiError("The cart is empty", 400));
//   }
//   req.body.returnCartItem = cartItems;

//   const nextCounter = (await salsePos.countDocuments()) + 1;
//   const reportsOrderCount = (await ReportsSalesModel.countDocuments()) + 1;
//   req.body.counter = nextCounter;
//   req.body.financialFund = financialFund

//     .filter((fund) => fund.allocatedAmount !== 0)
//     .map((fund) => ({
//       fundId: fund.fundId,
//       fundName: fund.fundName,
//       exchangeRate: fund.exchangeRate,
//       currencyCode: fund.currencyCode,
//       currencyID: fund.currencyID,
//       accountId: fund.accountId,
//       allocatedAmount: parseFloat(fund.allocatedAmount) || 0,
//     }));
//   req.body.employee = req.user._id;

//   const order = await salsePos.create(req.body);
//   await salsePointModel.findByIdAndUpdate(
//     { _id: req.body.salesPoint },
//     {
//       $inc: { sold: 1 },
//     },
//     { new: true }
//   );
//   let totalAllocatedAmount = 0;
//   const bulkUpdates = [];
//   const bulkUpdates2 = [];
//   const financialFundsMap = {};

//   const fundsPromises = financialFund
//     .filter((fund) => fund.allocatedAmount !== 0)
//     .map(async ({ fundId, allocatedAmount, exchangeRate }) => {
//       const financialFund = await FinancialFundsModel.findById(fundId);

//       if (!financialFund) {
//         return next(new ApiError(`Financial fund ${fundId} not found`, 404));
//       }

//       const updatedFundBalance =
//         parseFloat(financialFund.fundBalance) +
//         parseFloat(allocatedAmount || 0);

//       totalAllocatedAmount += parseFloat(allocatedAmount || 0);

//       bulkUpdates.push({
//         updateOne: {
//           filter: { _id: fundId },
//           update: { $inc: { fundBalance: parseFloat(allocatedAmount || 0) } },
//         },
//       });

//       await ReportsFinancialFundsModel.create({
//         date: timeIsoString,
//         amount: parseFloat(allocatedAmount || 0),
//         ref: order._id,
//         type: "sales",
//         financialFundId: fundId,
//         financialFundRest: updatedFundBalance,
//         exchangeRate,
//         paymentType: "Deposit",
//       });

//       financialFundsMap[fundId] = financialFund;
//     });

//   await Promise.all(fundsPromises);

//   await Promise.all([
//     FinancialFundsModel.bulkWrite(bulkUpdates),
//     FinancialFundsModel.bulkWrite(bulkUpdates2),
//     salsePos.findByIdAndUpdate(order._id, {
//       taxPrice: parseFloat(totalAllocatedAmount),
//       totalOrderPrice: parseFloat(totalAllocatedAmount),
//     }),
//   ]);

//   if (totalAllocatedAmount === 0) {
//     return res.status(400).json({
//       status: "error",
//       message:
//         "Total allocated amount is zero. Please review your allocations.",
//     });
//   }

//   const productMovementPromises = cartItems.map(async (item) => {
//     const product = await productModel.findOne({ qr: item.qr });
//     if (product && product.type !== "Service") {
//       const stockEntry = product.stocks.find(
//         (stock) => stock.stockId.toString() === stockID.toString()
//       );
//       if (stockEntry) {
//         stockEntry.productQuantity -= item.soldQuantity;
//         product.sold += item.soldQuantity;
//         product.soldByMonth = +item.soldQuantity;
//         product.soldByWeek = +item.soldQuantity;
//         const totalStockQuantity = product.stocks.reduce(
//           (total, stock) => total + stock.productQuantity,
//           0
//         );
//         await product.save();
//         await createProductMovement(
//           product._id,
//           order.id,
//           totalStockQuantity,
//           item.soldQuantity,
//           0,
//           0,
//           "movement",
//           "out",
//           "Sales Invoice",
//           dbName
//         );
//       }
//     }
//   });

//   await Promise.all(productMovementPromises);

//   await ReportsSalesModel.create({
//     customer: req.body.customarName,
//     orderId: order._id,
//     date: timeIsoString,
//     financialFunds: financialFund
//       .filter((fund) => fund.allocatedAmount !== 0)
//       .map((fund) => ({
//         exchangeRateIcon: fund.exchangeRateIcon,
//         exchangeRate: fund.exchangeRate,
//         fundId: fund.fundId,
//         fundName: fund.fundName,
//         exchangeRate: fund.exchangeRate,
//         currencyCode: fund.currencyCode,
//         currencyID: fund.currencyID,
//         accountId: fund.accountId,
//         allocatedAmount: fund.allocatedAmount || 0,
//       })),
//     amount: parseFloat(totalAllocatedAmount),
//     cartItems,
//     paymentType: "Multiple Funds",
//     employee: req.user._id,
//     counter: reportsOrderCount,
//     type: "pos",
//     salesPoint: req.body.salesPoint,
//   });

//   try {
//     const ActiveProductsValue = db.model(
//       "ActiveProductsValue",
//       ActiveProductsValueModel
//     );

//     await Promise.all(
//       cartItems.map(async (item) => {
//         const { type, currency: itemCurrency } = await productModel.findOne({
//           qr: item.qr,
//         });

//         if (type !== "Service") {
//           const totalValue = item.orginalBuyingPrice * item.soldQuantity;
//           const existingRecord = await ActiveProductsValue.findOne({
//             currency: itemCurrency,
//           });

//           if (existingRecord) {
//             existingRecord.activeProductsCount -= item.soldQuantity;
//             existingRecord.activeProductsValue -= totalValue;
//             await existingRecord.save();
//           } else {
//             await createActiveProductsValue(
//               item.soldQuantity,
//               totalValue,
//               itemCurrency,
//               dbName
//             );
//           }
//         }
//       })
//     );
//   } catch (err) {
//     console.log(err.message);
//   }

//   const history = createInvoiceHistory(
//     dbName,
//     order._id,
//     "create",
//     req.user._id
//   );

//   res.status(201).json({ status: "success", data: order, history });
// });
*/
// @desc    Get All order
// @route   GET /api/salse-pos
// @access  privet/All
exports.findAllSalsePos = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  // Initialize the base query to exclude type "pos"
  let query = { companyId };

  if (req.query.salesPointID) {
    query.salesPoint = req.query.salesPointID;
  }
  // Add keyword filter if provided
  if (req.query.keyword) {
    query = {
      $and: [
        query,
        {
          $or: [{ counter: req.query.keyword }],
        },
      ],
    };
  }

  let mongooseQuery = posReceiptsModel.find(query);

  // Apply sorting
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await posReceiptsModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "employee" })
    .populate({ path: "salesPoint" });

  const order = await mongooseQuery;

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: order.length,
    data: order,
  });
});

// @desc    Get All order
// @route   GET /api/salse-pos/:id
// @access  privet/All
exports.findOneSalsePos = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  let query = { companyId };
  // Check if the id is a valid ObjectId
  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  if (isObjectId) {
    query = { _id: id };
  } else {
    // Check if the id is a number
    query = { counter: id };
  }
  const order = await posReceiptsModel.findOne(query).populate("stock");

  if (!order) {
    return next(new ApiError(`No order found for this id ${id}`, 404));
  }

  res.status(200).json({ status: "true", data: order });
});

exports.findAllSalsePosForSalsePoint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const posPointId = req.params.id;

  // Initialize the base query to exclude type "pos"
  let query = { salesPoint: posPointId, companyId };
  // Add keyword filter if provided
  if (req.query.keyword) {
    query = {
      $and: [
        query,
        {
          $or: [{ counter: req.query.keyword }],
        },
      ],
    };
  }

  let mongooseQuery = salsePos.find(query);

  // Apply sorting
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await salsePos.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "employee" })
    .populate({ path: "salesPoint" });

  const order = await mongooseQuery;

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: order.length,
    data: order,
  });
});

exports.editPosOrder = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const data = new Date();
  const timeIsoString = data.toISOString();

  const { id } = req.params;
  const originalOrders = await orderModel.findById(id);
  oldQuantity = originalOrders?.cartItems?.quantity;
  oldValue = originalOrders?.returnCartItem?.buyingPrice;

  if (req.body.name) {
    req.body.slug = slugify(req.body.name);
  }

  const order = await orderModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  if (!order) {
    return next(new ApiError(`No Order for this id ${req.params.id}`, 404));
  }
  const originalOrder = await orderModel.findById(id);

  if (order) {
    const bulkOption = req.body.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $inc: {
            quantity: -item.quantity,
            sold: +item.quantity,
            activeCount: -item.quantity,
          },
        },
      },
    }));
    const bulkOption2 = originalOrder.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $inc: {
            quantity: +item.quantity,
            activeCount: +item.quantity,
          },
        },
      },
    }));

    await productModel.bulkWrite(bulkOption, {});
    await productModel.bulkWrite(bulkOption2, {});
    let customars;
    if (req.body.customerId)
      customars = await customersModel.findOne({
        _id: req.body.customerId,
        companyId,
      });

    const originalfinancialFunds = await FinancialFundsModel.findOne({
      _id: originalOrder.financialFund.fundId,
      companyId,
    });
    const financialFunds = await FinancialFundsModel.findOne({
      _id: order.financialFund.fundId,
      companyId,
    });
    originalfinancialFunds.fundBalance -= originalOrder.totalOrderPrice;

    financialFunds.fundBalance += order.totalOrderPrice;
    await originalfinancialFunds.save();
    await ReportsFinancialFundsModel.create({
      date: timeIsoString,
      amount: order.totalOrderPrice,
      ref: order._id,
      type: "sales",
      financialFundId: order.financialFund.fundId,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: req.body.exchangeRate,
      paymentType: "Deposit",
      companyId,
    });

    await financialFunds.save();

    if (customars) {
      customars.total -= originalOrder.totalOrderPrice;
      customars.TotalUnpaid -= originalOrder.totalOrderPrice;

      await customars.save();
    }
    await order.save();
  }

  originalOrder.cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    const totalStockQuantity = product.stocks.reduce(
      (total, stock) => total + stock.productQuantity,
      0
    );
    await createProductMovement(
      product._id,
      order.id,
      totalStockQuantity,
      item.soldQuantity,
      0,
      0,
      "movement",
      "in",
      "Edit Sales",
      companyId
    );
  });

  const history = createInvoiceHistory(
    companyId,
    id,
    "edit",
    req.user._id,
    new Date().toISOString()
  );

  res.status(200).json({
    status: "true",
    message: "Order updated successfully",
    data: order,
    history,
  });
});

exports.returnPosSales = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const financialFundsId = req.body.financialFund.id;
  const financialFunds = await FinancialFundsModel.findOne({
    _id: financialFundsId,
  });
  const orderId = req.body.orderId;
  const orders = await posReceiptsModel.findOne({ _id: orderId, companyId });

  // Helper function to pad zero
  const padZero = (value) => (value < 10 ? `0${value}` : value);

  const currentDateTime = new Date();
  const formattedDate = `${currentDateTime.getFullYear()}-${padZero(
    currentDateTime.getMonth() + 1
  )}-${padZero(currentDateTime.getDate())}T${padZero(
    currentDateTime.getHours()
  )}:${padZero(currentDateTime.getMinutes())}:${padZero(
    currentDateTime.getSeconds()
  )}`;

  req.body.paidAt = formattedDate;
  req.body.employee = req.user.name;
  const nextCounterRefund =
    (await refundPosSales.countDocuments({ companyId })) + 1;
  req.body.counter = nextCounterRefund;
  req.body.salesPoint = orders.salesPoint;
  const order = await refundPosSales.create(req.body);

  const bulkUpdateOptions = req.body.cartItems.map((item) => ({
    updateOne: {
      filter: { qr: item.qr, "stocks.stockId": item.stock._id, companyId },
      update: {
        $inc: {
          soldQuantity: +item.soldQuantity,
          "stocks.$.productQuantity": +item.soldQuantity,
        },
      },
    },
  }));

  await productModel.bulkWrite(bulkUpdateOptions);

  financialFunds.fundBalance -= req.body.paymentInFundCurrency;
  await financialFunds.save();

  await reportsFinancialFunds.create({
    date: req.body.paidAt,
    amount: req.body.paymentInFundCurrency,
    ref: order._id,
    type: "refund-POS-Receipts",
    financialFundId: financialFundsId,
    financialFundRest: financialFunds.fundBalance,
    exchangeRate: req.body.exchangeRate,
    paymentType: "Withdrawal",
    payment: null,
    companyId,
  });

  const returnCartItemUpdates = req.body.cartItems
    .map((incomingItem) => {
      const matchingIndex = orders.returnCartItem.findIndex(
        (item) => item.qr === incomingItem.qr
      );

      if (matchingIndex !== -1) {
        const newQuantity =
          orders.returnCartItem[matchingIndex].soldQuantity -
          incomingItem.soldQuantity;

        return {
          updateOne: {
            filter: { _id: orderId, companyId },
            update: {
              $set: {
                [`returnCartItem.${matchingIndex}.soldQuantity`]: newQuantity,
              },
            },
          },
        };
      }

      return null;
    })
    .filter(Boolean);

  await posReceiptsModel.bulkWrite(returnCartItemUpdates);

  const movementMap = new Map();
  const originalItems = orders.cartItems;
  req.body.cartItems.forEach((item, index) => {
    if (item.type === "unTracedproduct" || item.type === "expense") return;

    const diff = item.soldQuantity - originalItems[index].soldQuantity;
    if (!movementMap.has(item.qr)) {
      movementMap.set(item.qr, { ...item, quantityDiff: diff });
    } else {
      const existing = movementMap.get(item.qr);
      existing.quantityDiff += diff;
    }
  });

  await Promise.all(
    Array.from(movementMap.entries()).map(async ([qr, item]) => {
      const product = await productModel.findOne({ qr, companyId });

      if (product && product.type !== "Service") {
        const totalStockQuantity = product.stocks.reduce(
          (total, stock) => total + stock.productQuantity,
          0
        );

        await createProductMovement(
          product._id,
          order._id,
          totalStockQuantity,
          item.soldQuantity,
          0,
          0,
          "movement",
          "in",
          "Refund POS Receipt",
          companyId
        );
      }
    })
  );

  const history = createInvoiceHistory(
    companyId,
    orderId,
    "return",
    req.user._id,
    req.body.paidAt
  );

  res.status(200).json({
    status: "success",
    message: "The product has been returned",
    data: order,
    history,
  });
});

// @desc    Get All order
// @route   GET /api/getReturnOrder
// @access  privet
exports.getReturnPosSales = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { companyId };

  if (req.query.salesPointID) {
    query.salesPoint = req.query.salesPointID;
  }
  // Add keyword filter if provided
  if (req.query.keyword) {
    query = {
      $and: [
        query,
        {
          $or: [{ counter: req.query.keyword }],
        },
      ],
    };
  }
  let mongooseQuery = refundPosSales.find(query);

  // Apply sorting
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await refundPosSales.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);

  const refund = await mongooseQuery;

  res.status(200).json({
    status: "success",
    results: totalItems,
    Pages: totalPages,
    data: refund,
  });
});

// @desc    Get one order
// @route   GET /api/getReturnOrder/:id
// @access  privet
exports.getOneReturnPosSales = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const order = await refundPosSales.findOne({ _id: id, companyId });
  if (!order) {
    return next(new ApiError(`No order for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: order });
});

exports.canceledPosSales = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.employee = req.user.name;
  const currentDateTime = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Istanbul",
  });

  const { id } = req.params;
  const { stockId } = req.body;
  const canceled = await posReceiptsModel.findOne({ _id: id });

  if (canceled.type !== "cancel") {
    if (canceled.financialFund && canceled.financialFund.length > 0) {
      for (const fundId of canceled.financialFund) {
        const financialFund = await FinancialFundsModel.findOne({
          _id: fundId.fundId,
          companyId,
        });
        financialFund.fundBalance -= fundId.allocatedAmount;
        await financialFund.save();

        await ReportsFinancialFundsModel.create({
          date: currentDateTime,
          amount: fundId.allocatedAmount,
          ref: canceled._id,
          type: "cancel",
          financialFundId: financialFund._id,
          financialFundRest: financialFund.fundBalance,
          exchangeRate: fundId.allocatedAmount,
          paymentType: "Withdrawal",
          payment: null,
          companyId,
        });
      }
    }

    canceled.cartItems.map(async (item) => {
      const product = await productModel.findOne({ qr: item.qr });
      if (product && product.type !== "Service") {
        const stockEntry = product.stocks.find(
          (stock) => stock.stockId === stockId
        );

        if (stockEntry) {
          stockEntry.productQuantity += item.soldQuantity;
          product.sold -= item.soldQuantity;
          createProductMovement(
            product._id,
            id,
            stockEntry.productQuantity,
            item.soldQuantity,
            0,
            0,
            "movement",
            "in",
            "cancel",
            companyId
          );
          await product.save();
        }
      }
    });

    const order = await posReceiptsModel.updateOne(
      { _id: id, companyId },
      {
        type: "cancel",
        date: currentDateTime,
        counter: "cancel " + canceled.counter,
      },
      { new: true }
    );

    createInvoiceHistory(
      companyId,
      id,
      "cancel",
      req.user._id,
      currentDateTime
    );
    res.status(200).json({
      status: "success",
      message: "The order has been canceled",
      data: order,
    });
  } else {
    res.status(400).json({
      status: "faild",
      message: "The type is cancel",
    });
  }
});

exports.getReceiptForDate = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const specificDate = new Date().toISOString().slice(0, 10);
  const specificDateString = specificDate;

  const { id } = req.params;

  const orders = await posReceiptsModel
    .find({
      createdAt: { $gte: specificDateString },
      type: "pos",
      salesPoint: id,
      companyId,
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    data: orders,
  });
});

exports.getRefundReceiptForDate = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const specificDate = new Date().toISOString().slice(0, 10);
  const specificDateString = specificDate;

  const { id } = req.params;

  const orders = await refundPosSales
    .find({
      createdAt: { $gte: specificDateString },
      companyId,
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    data: orders,
  });
});

exports.mergeRefundReceipts = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;
  const { startDate, endDate, id } = req.body;
  req.body.employee = req.user.name;
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const nextCounter =
    (await returnOrderModel.countDocuments({ companyId })) + 1;
  const salesPoints = await salesPointModel
    .findOne({ _id: id, companyId })
    .populate("salesPointCurrency");

  const receipts = await refundPosSales.find({
    createdAt: {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
      $lte: new Date(`${endDate}T23:59:59.999Z`),
    },
    type: "Refund Pos",
    companyId,
  });

  const cartItems = [];
  const fish = [];
  const taxSummaryMap = new Map();
  const financialFundsMap = new Map();
  let totalInMainCurrency = 0,
    invoiceGrandTotal = 0,
    invoiceSubTotal = 0,
    invoiceTax = 0;
  for (const order of receipts) {
    for (const item of order.cartItems) {
      cartItems.push({
        qr: item.qr,
        name: item.name,
        sellingPrice: item.sellingPrice,
        soldQuantity: item.soldQuantity,
        orginalBuyingPrice: item.orginalBuyingPrice,
        convertedBuyingPrice: item.convertedBuyingPrice || 0,
        total: item.total,
        totalWithoutTax: item.totalWithoutTax,
        unit: item.unit,
        tax: {
          _id: item.tax._id,
          tax: item.tax.tax,
          name: item.tax.name,
          salesAccountTax: item.tax.salesAccountTax,
        },
        discountAmount: item.discountAmount,
        discountPercentege: item.discountPercentege,
        taxValue: item.taxValue,
      });

      fish.push(order.counter);
    }
    totalInMainCurrency += order.totalInMainCurrency;
    invoiceGrandTotal += order.invoiceGrandTotal;
    invoiceSubTotal += order.invoiceSubTotal;
    invoiceTax += order.invoiceTax;

    if (order.taxSummary) {
      for (const item of order.taxSummary) {
        try {
          if (taxSummaryMap.has(item.taxId)) {
            const taxData = taxSummaryMap.get(item.taxId);
            taxData.totalTaxValue += item.totalTaxValue || 0;
            taxData.discountTaxValue += item.discountTaxValue || 0;
          } else {
            taxSummaryMap.set(item.taxId, {
              taxId: item.taxId,
              taxRate: item.taxRate,
              totalTaxValue: item.totalTaxValue || 0,
              discountTaxValue: item.discountTaxValue || 0,
              salesAccountTax: item.salesAccountTax,
            });
          }
        } catch (err) {
          console.error("Error processing tax summary item:", err);
        }
      }
    }
    if (order.financailFund) {
      for (const item of order.financailFund) {
        try {
          if (financialFundsMap.has(item.fundId)) {
            const fundData = financialFundsMap.get(item.fundId);
            fundData.allocatedAmount += item.allocatedAmount || 0;
          } else {
            financialFundsMap.set(item.id, {
              id: item.fundId,
              name: item.fundName,
              currencyCode: item.currencyCode || 0,
              exchangeRate: item.exchangeRate || 0,
              currency: item.currency,
              currencyID: item.currencyID,
              allocatedAmount: item.allocatedAmount,
            });
          }
        } catch (err) {
          console.error("Error processing tax summary item:", err);
        }
      }
    }
  }

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const ts = Date.now();
  const date_ob = new Date(ts);

  const date = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())}T${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}`;

  const aggregatedFunds = Array.from(financialFundsMap.values());
  const taxSummary = Array.from(taxSummaryMap.values());

  const newOrderData = {
    invoicesItems: cartItems,
    invoiceGrandTotal: invoiceGrandTotal,
    orderDate: date,
    type: "bills",
    totalInMainCurrency: totalInMainCurrency,
    counter: nextCounter,
    paymentsStatus: "paid",
    currency: {
      id: salesPoints.salesPointCurrency._id,
      currencyCode: salesPoints.salesPointCurrency.currencyCode,
      exchangeRate: salesPoints.salesPointCurrency.exchangeRate,
      currencyAbbr: salesPoints.salesPointCurrency.currencyAbbr,
      currencyName: salesPoints.salesPointCurrency.currencyName,
    },
    exchangeRate: 1,
    receipts: fish,
    financailFund: aggregatedFunds,
    manuallInvoiceDiscountValue: 0,
    manuallInvoiceDiscount: 0,
    taxSummary: taxSummary,
    invoiceSubTotal: invoiceSubTotal,
    invoiceTax: invoiceTax,
    discountType: "value",
    companyId,
  };
  const sales = await returnOrderModel.create(newOrderData);

  res.status(201).json({
    status: "success",
    message: "All receipts merged successfully",
    data: sales,
  });
});
