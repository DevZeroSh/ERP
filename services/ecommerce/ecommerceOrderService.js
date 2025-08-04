const { default: mongoose } = require("mongoose");
const CartModel = require("../../models/ecommerce/cartModel");
const nodeBase64 = require("nodejs-base64-converter");
const crypto = require("crypto");
const productModel = require("../../models/productModel");
const asyncHandler = require("express-async-handler");
const ecommerceOrderModel = require("../../models/ecommerce/ecommerceOrderModel");
const customersModel = require("../../models/customarModel");
const ApiError = require("../../utils/apiError");

const { PaymentService } = require("./paymentService");
const UserModel = require("../../models/ecommerce/E_user_Modal");
const orderModel = require("../../models/orderModel");
const financialFundsSchema = require("../../models/financialFundsModel");
const { createProductMovement } = require("../../utils/productMovement");
const { default: axios } = require("axios");

exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const getFormattedDate = () => {
    const padZero = (num) => String(num).padStart(2, "0");
    const ts = Date.now();
    const dateOb = new Date(ts);
    const date = padZero(dateOb.getDate());
    const month = padZero(dateOb.getMonth() + 1);
    const year = dateOb.getFullYear();
    const hours = padZero(dateOb.getHours());
    const minutes = padZero(dateOb.getMinutes());
    const seconds = padZero(dateOb.getSeconds());
    return `${year}-${month}-${date} ${hours}:${minutes}`;
  };

  const formattedDate = getFormattedDate();

  // app settings
  const taxPrice = 0;
  const shippingPrice = 0;

  // 1) Get cart depend on cartId
  const { id } = req.params;
  const cart = await CartModel.findOne({ _id: id, companyId }).populate(
    "cartItems.product"
  );

  if (!cart) {
    return next(new ApiError(`There is no such cart with id ${id}`, 404));
  }

  // 2) Get order price depend on cart price "Check if coupon apply"
  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;

  const totalOrderPrice = cartPrice + taxPrice + shippingPrice;
  const nextCounter =
    (await ecommerceOrderModel.countDocuments({ companyId })) + 1;

  // Calculate desi for each cart item
  const cartItemsWithDesi = cart.cartItems.map((item) => {
    const { length, width, height, weight } = item.product;
    const desi = (length * width * height) / 5000; // Desi formula

    return { ...item.toObject(), desi };
  });

  const { name, phoneNumber, idNumber, email } = req?.body?.userInfo;

  // 3) Create order with default paymentMethodType cash
  const order = await ecommerceOrderModel.create({
    customar: req.user ? req.user._id : null,
    cartItems: cartItemsWithDesi,
    anonymousUser: { name, phoneNumber, idNumber, email },
    shippingAddress: req.body.shippingAddress,
    billingAddress: req.body.billingAddress,
    ipAddress: req.body.ipAddress,
    paymentMethodType: req.body.paymentMethodType,
    date: formattedDate,
    orderNumber: nextCounter,
    totalOrderPrice,
    shippingPrice: req.body.totalShippingCost,
    token: cart.token || undefined,
    companyId,
  });

  try {
    const { body } = req;
    const paymentContext = await PaymentService(order, body);

    // 4) After creating order, decrement product quantity, increment product sold
    if (order) {
      const bulkOption = cart.cartItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product, companyId },
          update: {
            $inc: { activeCount: -item.quantity, sold: -item.quantity },
          },
        },
      }));
      await productModel.bulkWrite(bulkOption, {});

      // 5) Clear cart depending on cartId
      await CartModel.findOneAndDelete({ _id: id, companyId });
    }

    // const history = createInvoiceHistory(
    //     dbName,
    //     order._id,
    //     "create",
    //     req.user._id,
    //     req.body.orderDate || timeIsoString
    //   );

    res.status(201).json({ status: "success", data: order });
  } catch (error) {
    return next(error);
  }
});

exports.createOrderDashboard = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const getFormattedDate = () => {
    const padZero = (num) => String(num).padStart(2, "0");
    const ts = Date.now();
    const dateOb = new Date(ts);
    const date = padZero(dateOb.getDate());
    const month = padZero(dateOb.getMonth() + 1);
    const year = dateOb.getFullYear();
    const hours = padZero(dateOb.getHours());
    const minutes = padZero(dateOb.getMinutes());
    const seconds = padZero(dateOb.getSeconds());
    return `${year}-${month}-${date} ${hours}:${minutes}`;
  };

  const formattedDate = getFormattedDate();

  const taxPrice = 0;
  const shippingPrice = 0;

  try {
    const { customerId, shippingAddress, billingAddress, cartItems } = req.body;

    if (!cartItems || !cartItems.length) {
      return next(new ApiError("Cart items are required", 400));
    }

    // Calculate total order price
    const cartPrice = cartItems.reduce(
      (acc, item) => acc + item.taxPrice * item.quantity,
      0
    );
    const totalOrderPrice = cartPrice + taxPrice + shippingPrice;
    const nextCounter =
      (await ecommerceOrderModel.countDocuments({ companyId })) + 1;

    // Create order with default paymentMethodType EFT
    const order = await ecommerceOrderModel.create({
      customar: req.user._id,
      cartItems: cartItems,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      paymentMethodType: "transfer",
      date: formattedDate,
      orderNumber: nextCounter,
      totalOrderPrice,
      companyId,
    });

    // const customer = await customersModel.findById(customerId);

    // await orderInvoiceModel.create({
    //   date: formattedDate,
    //   employee: req.user._id,
    //   priceExchangeRate: totalOrderPrice,
    //   cartItems,
    //   returnCartItem: cartItems,
    //   totalOrderPrice,
    //   customarId: customerId,
    //   customarName: customer.name,
    //   customarEmail: customer.email,
    //   customarPhone: customer.phoneNumber,
    //   customarAddress: billingAddress,
    //   type: "ecommerce",
    //   counter: "in-" + nextCounter,
    //   paid: "paid",
    // });

    // After creating order, decrement product quantity, increment product sold
    if (order) {
      const bulkOption = cartItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product, companyId },
          update: {
            $inc: { activeCount: -item.quantity, sold: -item.quantity },
          },
        },
      }));
      await productModel.bulkWrite(bulkOption, {});
    }

    res.status(201).json({ status: "success", data: order });
  } catch (error) {
    return next(error);
  }
});

exports.filterOrderCustomerById = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Pagination settings
  const pageSize = 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  // Build the query object for filtering by customer ID
  let query = { customar: req.params.id, companyId };

  // Add search functionality for orderNumber or date if provided in query params
  if (req.query.orderNumber || req.query.date) {
    query = {
      $and: [
        { customar: req.params.id },
        {
          $or: [
            { orderNumber: { $regex: req.query.orderNumber, $options: "i" } },
            { date: { $regex: req.query.date, $options: "i" } },
          ],
        },
      ],
    };
  }

  // Create a Mongoose query object
  let mongooseQuery = ecommerceOrderModel.find(query);

  // Apply sorting
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Apply pagination
  const totalItems = await ecommerceOrderModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply skip and limit to paginate results
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);

  // Execute the query and fetch the results
  const orders = await mongooseQuery;

  // Return the paginated orders with total pages and current page
  res.status(200).json({
    status: "success",
    results: orders.length,
    totalItems,
    totalPages,
    currentPage: page,
    data: orders,
  });
});

exports.findAllOrderforCustomer = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = {
    customar: req.user._id,
    companyId,
  };
  let mongooseQuery = ecommerceOrderModel.find(query);

  if (req.query.keyword) {
    query = {
      $and: [
        { archives: { $ne: true } },
        {
          $or: [
            { name: { $regex: req.query.keyword, $options: "i" } },
            { qr: { $regex: req.query.keyword, $options: "i" } },
          ],
        },
      ],
    };
    mongooseQuery = mongooseQuery.find(query);
  }
  sortQuery = { createdAt: -1 };
  mongooseQuery = mongooseQuery.populate({
    path: "cartItems.product",
  });

  mongooseQuery = mongooseQuery.sort(sortQuery);

  const totalItems = await ecommerceOrderModel.countDocuments({ query });

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);
  const order = await mongooseQuery;
  res.status(200).json({
    status: "success",
    results: order.length,
    Pages: totalPages,

    data: order,
  });
});

exports.findAllOrders = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;
  if (!companyId) return res.status(400).json({ message: "companyId is required" });

  const pageSize = parseInt(req.query.limit, 10) || 25;
  const page = parseInt(req.query.page, 10) || 1;
  const skip = (page - 1) * pageSize;

  const pipeline = [{ $match: { companyId } }];

  const keyword = req.query.keyword?.replace(/\s+/g, ".*");
  if (keyword) {
    const keywordRegex = new RegExp(keyword, "i");
    pipeline.push(
      {
        $addFields: {
          shipmentCode: {
            $concat: [
              "NON",
              { $substr: [{ $toString: "$_id" }, 15, 9] },
              "-",
              "$orderNumber",
            ],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "customar",
          foreignField: "_id",
          as: "customarData",
        },
      },
      {
        $match: {
          $or: [
            { orderNumber: { $regex: keywordRegex } },
            { shipmentCode: { $regex: keywordRegex } },
            { "customarData.name": { $regex: keywordRegex } },
          ],
        },
      }
    );
  }

  if (req.query.orderType) {
    const isProgress = req.query.orderType === "progress";
    pipeline.push({
      $match: {
        $expr: isProgress
          ? {
              $gt: [
                {
                  $size: {
                    $setUnion: [
                      {
                        $map: {
                          input: { $ifNull: ["$cartItems", []] },
                          as: "item",
                          in: "$$item.orderStatus",
                        },
                      },
                    ],
                  },
                },
                1,
              ],
            }
          : {
              $eq: [
                { $size: { $ifNull: ["$cartItems", []] } },
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$cartItems", []] },
                      cond: {
                        $eq: ["$$this.orderStatus", req.query.orderType],
                      },
                    },
                  },
                },
              ],
            },
      },
    });
  }

  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await ecommerceOrderModel.aggregate(countPipeline).exec();
  const totalItems = countResult[0]?.total || 0;

  const sortQuery = req.query.sold
    ? { totalOrderPrice: parseInt(req.query.sold, 10) === 1 ? 1 : -1 }
    : { createdAt: -1 };

  pipeline.push(
    { $sort: sortQuery },
    { $skip: skip },
    { $limit: pageSize },
    { $unwind: "$cartItems" },
    {
      $lookup: {
        from: "products",
        localField: "cartItems.product",
        foreignField: "_id",
        as: "cartItems.product",
      },
    },
    { $unwind: "$cartItems.product" },
    {
      $lookup: {
        from: "units",
        localField: "cartItems.product.unit",
        foreignField: "_id",
        as: "cartItems.product.unit",
      },
    },
    {
      $unwind: {
        path: "$cartItems.product.unit",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: "$_id",
        order: { $first: "$$ROOT" },
        cartItems: { $push: "$cartItems" },
      },
    },
    {
      $replaceRoot: {
        newRoot: { $mergeObjects: ["$order", { cartItems: "$cartItems" }] },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "customar",
        foreignField: "_id",
        as: "customar",
      },
    },
    { $unwind: { path: "$customar", preserveNullAndEmptyArrays: true } }
  );

  const buildStatusStage = (status) => ({
    $eq: [
      { $size: { $ifNull: ["$cartItems", []] } },
      {
        $size: {
          $filter: {
            input: { $ifNull: ["$cartItems", []] },
            cond: { $eq: ["$$this.orderStatus", status] },
          },
        },
      },
    ],
  });

  const statusCountPipeline = [
    {
      $addFields: {
        parsedDate: { $toDate: "$date" },
        orderStatus: {
          $switch: {
            branches: [
              { case: buildStatusStage("delivered"), then: "delivered" },
              { case: buildStatusStage("requested"), then: "requested" },
              { case: buildStatusStage("processed"), then: "processed" },
              { case: buildStatusStage("shipped"), then: "shipped" },
              { case: buildStatusStage("cancelled"), then: "cancelled" },
              { case: buildStatusStage("returned"), then: "returned" },
              { case: buildStatusStage("cancelrequest"), then: "cancelrequest" },
              { case: buildStatusStage("returnrequest"), then: "returnrequest" },
              { case: buildStatusStage("approved"), then: "approved" },
            ],
            default: "progress",
          },
        },
      },
    },
    {
      $facet: {
        totalCounts: [{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }],
        todayCounts: [
          {
            $match: {
              $expr: {
                $eq: [
                  {
                    $dateToString: { format: "%Y-%m-%d", date: "$parsedDate" },
                  },
                  { $dateToString: { format: "%Y-%m-%d", date: new Date() } },
                ],
              },
            },
          },
          { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        ],
      },
    },
  ];

  const [orders, [statusCounts = { totalCounts: [], todayCounts: [] }]] =
    await Promise.all([
      orderModel.aggregate(pipeline).exec(),
      orderModel.aggregate(statusCountPipeline).exec(),
    ]);

  const formatCounts = (source) => (status) =>
    source.find((s) => s._id === status)?.count || 0;
  const getTotal = formatCounts(statusCounts.totalCounts);
  const getToday = formatCounts(statusCounts.todayCounts);

  const statusCountsFormatted = {
    todayCompleted: getToday("delivered"),
    todayRequested: getToday("requested"),
    todayProcessed: getToday("processed"),
    todayApproved: getToday("approved"),
    todayInProgress: getToday("progress"),
    todayShipped: getToday("shipped"),
    todayCancelled: getToday("cancelled"),
    todayReturned: getToday("returned"),
    totalCompleted: getTotal("delivered"),
    totalRequested: getTotal("requested"),
    totalProcessed: getTotal("processed"),
    totalApproved: getTotal("approved"),
    totalInProgress: getTotal("progress"),
    totalShipped: getTotal("shipped"),
    totalCancelled: getTotal("cancelled"),
    totalReturned: getTotal("returned"),
    returnRequest: getTotal("returnrequest"),
    cancelRequest: getTotal("cancelrequest"),
    totalOthers:
      getTotal("requested") +
      getTotal("processed") +
      getTotal("shipped") +
      getTotal("approved") +
      getTotal("progress"),
  };

  res.status(200).json({
    status: "success",
    results: orders.length,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    data: orders,
    statusCounts: statusCountsFormatted,
  });
});

exports.filterOneOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;

  const order = await ecommerceOrderModel
    .findOne({ _id: id, companyId })
    .populate({ path: "cartItems.product" })
    .populate({ path: "cartItems.product", populate: { path: "unit tax" } })
    .populate({
      path: "customar",
      select: "name email phoneNumber",
    })
    .lean();

  res.status(200).json({ status: "success", data: order });
});

exports.UpdateEcommersOrder = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    req.body.companyId = companyId;
    const { id } = req.params;

    const order = await ecommerceOrderModel.findOne({ _id: id, companyId });
    if (!order) {
      return next(new ApiError(`No order found for ID: ${id}`, 404));
    }

    const getFormattedDate = () => {
      const padZero = (num) => String(num).padStart(2, "0");
      const ts = Date.now();
      const dateOb = new Date(ts);
      const date = padZero(dateOb.getDate());
      const month = padZero(dateOb.getMonth() + 1);
      const year = dateOb.getFullYear();
      const hours = padZero(dateOb.getHours());
      const minutes = padZero(dateOb.getMinutes());
      return `${year}-${month}-${date} ${hours}:${minutes}`;
    };

    const formattedDate = getFormattedDate();

    const updatedCartItems = req.body.cartItems;
    if (!Array.isArray(updatedCartItems)) {
      return next(new ApiError("cartItems must be an array", 400));
    }

    updatedCartItems.forEach((item) => {
      const index = order.cartItems.findIndex(
        (i) => i.product.toString() === item.product._id
      );

      if (index !== -1) {
        order.cartItems[index].orderStatus = item.orderStatus;
        order.cartItems[index].statusUpdatedAt = formattedDate;
      }
    });

    await order.save();

    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    console.error("UpdateEcommersOrder error:", error);
    next(new ApiError("Failed to update order", 500));
  }
});

exports.customarChangeOrderStatus = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    const { id } = req.params;
    const updates = req.body;
    // Find the order by ID
    const order = await ecommerceOrderModel.findOne({ _id: id, companyId });

    req.body.companyId = companyId;
    // Check if the order exists
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Ensure order has cartItems
    if (!order.cartItems || !Array.isArray(order.cartItems)) {
      return res
        .status(400)
        .json({ error: "Invalid order data: missing cartItems" });
    }

    const getFormattedDate = () => {
      const padZero = (num) => String(num).padStart(2, "0");
      const ts = Date.now();
      const dateOb = new Date(ts);
      const date = padZero(dateOb.getDate());
      const month = padZero(dateOb.getMonth() + 1);
      const year = dateOb.getFullYear();
      const hours = padZero(dateOb.getHours());
      const minutes = padZero(dateOb.getMinutes());
      const seconds = padZero(dateOb.getSeconds());
      return `${year}-${month}-${date} ${hours}:${minutes}`;
    };

    const formattedDate = getFormattedDate();

    // Update the orderStatus for each cart item based on the provided updates
    updates.forEach((update) => {
      const itemIndex = order.cartItems.findIndex((item) => {
        return item.product.toString() === update._id;
      });
      if (itemIndex !== -1) {
        order.cartItems[itemIndex].orderStatus = update.orderStatus;
        // Use the correct timestamp here
        order.cartItems[itemIndex].orderStatus.updatedAt = formattedDate;
      }
    });

    // Save the updated order
    await order.save();

    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    next(error);
  }
});

exports.convertEcommersOrderToInvoice = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  let financialFunds;
  if (req.body.paid === "paid") {
    financialFunds = await financialFundsSchema.findById({
      _id: req.body.financialFunds,
    });
  }
  const { id } = req.params;

  const getFormattedDate = () => {
    const padZero = (num) => String(num).padStart(2, "0");
    const ts = Date.now();
    const dateOb = new Date(ts);
    const date = padZero(dateOb.getDate());
    const month = padZero(dateOb.getMonth() + 1);
    const year = dateOb.getFullYear();
    const hours = padZero(dateOb.getHours());
    const minutes = padZero(dateOb.getMinutes());
    const seconds = padZero(dateOb.getSeconds());
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
  };

  const formattedDate = getFormattedDate();

  let createCustomer;
  const user = await UserModel.findOne({
    _id: req.body.customer.id,
    companyId,
  });

  if (!user.isCustomer) {
    createCustomer = await customersModel.create({
      name: user.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      uesrid: user._id,
      companyId,
    });
    user.isCustomer = true;
    user.save();
  } else {
    createCustomer = await customersModel.findOne({
      uesrid: req.body.customarId,
      companyId,
    });
  }

  const timeIsoString = formattedDate;

  // Generate the next order number
  const nextCounter = (await orderModel.countDocuments({ companyId })) + 1;
  req.body.type = "sales";
  // Create the new order
  const order = await orderModel.create({
    companyId,
    employee: req.user._id,
    invoiceName: req.body.invoiceName,
    invoiceDate: req.body.invoiceDate,
    customer: {
      id: createCustomer._id,
      name: createCustomer.name,
      phone: createCustomer.phoneNumber,
      email: createCustomer.email,
      address: createCustomer.address,
      taxAdministration: createCustomer.taxAdministration,
      taxNumber: createCustomer.taxNumber,
      country: createCustomer.country,
      city: createCustomer.city,
    },
    paymentsStatus: req.body.paymentsStatus,
    paymentDate: req.body.paymentDate,
    paymentDescription: req.body.paymentDescription,
    paymentInFundCurrency: req.body.paymentInFundCurrency,
    financailFund: req.body.financailFund,
    currencyExchangeRate: req.body.currencyExchangeRate,
    invoiceGrandTotal: req.body.invoiceGrandTotal,
    totalInMainCurrency: req.body.totalInMainCurrency,
    invoiceSubTotal: req.body.invoiceSubTotal,
    invoiceTax: req.body.invoiceTax,
    tag: req.body.tag,
    type: "ecommerce",
    priceExchangeRate: req.body.priceExchangeRate,
    invoicesItems: req.body.invoicesItems,
    returnCartItem: req.body.invoicesItems,
    currencyCode: req.body.currency,
    totalOrderPrice: req.body.totalOrderPrice,
    totalPriceAfterDiscount: req.body.totalPriceAfterDiscount,
    taxs: req.body.taxs,
    price: req.body.price,
    taxSummary: req.body.taxSummary,
    taxRate: req.body.taxRate,
    onefinancialFunds: req.body.financialFunds,
    paidAt: timeIsoString,
    counter: nextCounter,
    paid: "paid",
  });

  // Fetch the ecommerce order by ID and update it
  const ecommerceOrder = await ecommerceOrderModel.findOneAndUpdate(
    { _id: id, companyId },
    { invoiceCreated: true, refNumber: order._id },
    { new: true }
  );

  if (!ecommerceOrder) {
    return next(new Error("Order not found"));
  }

  const productQRCodes = req.body.invoicesItems.map((item) => item.qr);

  const products = await productModel.find({
    qr: { $in: productQRCodes },
    companyId,
  });

  const productMap = new Map(products.map((prod) => [prod.qr, prod]));

  const bulkOption = await Promise.all(
    req.body.invoicesItems.map(async (item) => {
      if (item.type !== "unTracedproduct" && item.type !== "expense") {
        const product = productMap.get(item.qr);

        const totalStockQuantity = product.stocks.reduce(
          (total, stock) => total + stock.productQuantity,
          0
        );

        await createProductMovement(
          product._id,
          order.id,
          totalStockQuantity - item.soldQuantity,
          item.soldQuantity,
          0,
          0,
          "movement",
          "out",
          "Sales Invoice",
          companyId
        );

        return {
          updateOne: {
            filter: {
              qr: item.qr,
              "stocks.stockId": item.stock._id,
              companyId,
            },
            update: {
              $inc: {
                quantity: -item.soldQuantity,
                "stocks.$.productQuantity": -item.soldQuantity,
                soldByMonth: +item.soldQuantity,
                soldByWeek: +item.soldQuantity,
                sold: +item.soldQuantity,
              },
            },
          },
        };
      }
    })
  );

  // Filter out null or undefined operations
  const validBulkOptions = bulkOption.filter((option) => option !== null);

  // Perform bulkWrite
  await productModel.bulkWrite(validBulkOptions);

  // Respond with success
  res.status(201).json({ status: "success", data: order });
});

exports.payTROrder = asyncHandler(async (req, res, next) => {
  try {
    const merchant_id = 562290;
    const merchant_key = "inc8Zh7sG7cwpYLs";
    const merchant_salt = "XALxqFJxE3CYuo1a";

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return res.status(500).json({ error: "Missing PayTR credentials" });
    }
    const { name, phoneNumber, email } =
      req?.body?.userInfo || req?.body?.order?.userInfo;

    const payment_amount = Number(
      req?.body?.totalAmount || req?.body?.order?.totalAmount
    );
    const user_ip = req?.body?.ipAddress || req?.body?.order?.ipAddress;
    const user_name =
      name ||
      req?.body?.shippingAddress?.fullName ||
      req?.body?.order?.fullName;
    const user_address =
      req?.body?.shippingAddress?.details ||
      req?.body?.order?.shippingAddress?.details;
    const user_phone =
      phoneNumber ||
      req?.body?.shippingAddress?.phone ||
      req?.body?.order?.shippingAddress?.phone;
    const order = req?.body?.cart || req?.body?.order?.cart;

    const pays = Math.round(payment_amount * 100);

    if (
      !email ||
      !pays ||
      !user_ip ||
      !user_name ||
      !user_address ||
      !user_phone ||
      !order ||
      isNaN(pays) ||
      pays <= 0
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const userBasket = order?.cartItems.map((item) => {
      return [item.product, item.taxPrice.toFixed(2), item.quantity];
    });
    const userBasketStr = JSON.stringify(userBasket);

    const merchant_oid = order?._id;
    const user_basket = nodeBase64.encode(userBasketStr);
    const max_installment = "0";
    const no_installment = "0";
    const currency = "TL";
    const test_mode = "0";
    const merchant_ok_url = "https://noontek.com/order-complete";
    const merchant_fail_url = "https://noontek.com/error404";
    const timeout_limit = 30;
    const debug_on = 1;
    const lang = "en";

    const hashSTR = `${merchant_id}${user_ip}${merchant_oid}${email}${pays}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
    const paytr_token = hashSTR + merchant_salt;

    const token = crypto
      .createHmac("sha256", merchant_key)
      .update(paytr_token)
      .digest("base64");

    const data = {
      merchant_id,
      user_ip,
      merchant_oid,
      email,
      payment_amount: pays,
      user_basket,
      no_installment,
      max_installment,
      currency,
      test_mode,
      merchant_ok_url,
      merchant_fail_url,
      user_name,
      user_address,
      user_phone,
      timeout_limit,
      debug_on,
      lang,
      paytr_token: token,
      payment_type: "card",
    };

    try {
      const response = await axios.post(
        "https://www.paytr.com/odeme/api/get-token",
        data,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.status === "success") {
        res.json({ token: response.data.token });
      } else {
        console.error("Error response 1274:", response?.data);
        res
          .status(400)
          .json({ error: "Failed to get token", message: response?.data });
      }
    } catch (error) {
      console.error("Error message 1280:", error.message);
      res.status(500).json({ error: "Payment initialization failed" });
    }
  } catch (error) {
    console.log("error 1284", error);
  }
});

exports.returnMoney = asyncHandler(async (req, res, next) => {
  try {
    const merchant_id = 562290;
    const merchant_key = "inc8Zh7sG7cwpYLs";
    const merchant_salt = "XALxqFJxE3CYuo1a";
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);

    const getFormattedDate = () => {
      const padZero = (num) => String(num).padStart(2, "0");
      const ts = Date.now();
      const dateOb = new Date(ts);
      const date = padZero(dateOb.getDate());
      const month = padZero(dateOb.getMonth() + 1);
      const year = dateOb.getFullYear();
      const hours = padZero(dateOb.getHours());
      const minutes = padZero(dateOb.getMinutes());
      return `${year}-${month}-${date} ${hours}:${minutes}`;
    };

    const formattedDate = getFormattedDate();

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return res.status(500).json({ error: "Missing PayTR credentials" });
    }

    const return_amount = parseFloat(req?.body?.return_amount).toFixed(2);
    const merchant_oid = req?.body?.merchant_oid;

    if (!return_amount || !merchant_oid) {
      return res.status(500).json({ error: "Missing required fields" });
    }

    const hashSTR = `${merchant_id}${merchant_oid}${return_amount}${merchant_salt}`;

    const token = crypto
      .createHmac("sha256", merchant_key)
      .update(hashSTR)
      .digest("base64");

    const data = {
      merchant_id,
      merchant_oid,
      return_amount,
      paytr_token: token,
    };

    try {
      const qs = new URLSearchParams(data).toString();
      const response = await axios.post(
        "https://www.paytr.com/odeme/iade",
        qs,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      if (response.data.status === "success") {
        const order = await orderModel.findById(merchant_oid);
        if (!order) {
          return next(
            new ApiError(`No order found for ID: ${merchant_oid}`, 404)
          );
        }

        order.isRefunded = true;

        await order.save();
        res.json(response.data);
      } else {
        console.error("Error response 1330:", response?.data);
        return res
          .status(400)
          .json({ error: "Failed to get token", message: response?.data });
      }
    } catch (error) {
      console.error("Error message 1336:", error.message);
      return res.status(500).json({ error: "Payment initialization failed" });
    }
  } catch (error) {
    console.log("error 1340", error);
  }
});
