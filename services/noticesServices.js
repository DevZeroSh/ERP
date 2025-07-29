const { default: mongoose } = require("mongoose");
const ecommerceOrderModel = require("../models/ecommerce/ecommerceOrderModel");
const productModel = require("../models/productModel");
const asyncHandler = require("express-async-handler");
const productQuestionsModel = require("../models/ecommerce/productQuestionsModel");

exports.getNotices = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  // Fetch products from the database
  const products = await productModel.find({
    type: { $ne: "Service" },
    archives: { $ne: "true" },
    companyId,
  });

  // Generate product notices
  const productNotices = products
    .filter((item) => {
      const totalQuantity = item.stocks.reduce(
        (sum, stock) => sum + stock.productQuantity,
        0
      );
      return totalQuantity <= item.alarm;
    })
    .map((item) => ({
      qr: item.qr,
      name: item.name,
      id: item._id,
      totalQuantity: item.stocks.reduce(
        (sum, stock) => sum + stock.productQuantity,
        0
      ),
      message: item.name.substring(0, 10) + "...",
      type: "product",
      date: item.updatedAt,
    }));

  const questions = await productQuestionsModel.find({
    answer: "",
    companyId,
  });

  // Generate product questions notices
  const productQuestionsNotices = questions.map((question) => ({
    id: question.product,
    message: question.question.substring(0, 10) + "...",
    type: "question",
    date: question.updateTime,
  }));

  // Fetch orders with cart items having all orderStatus as 'requested'
  const orders = await ecommerceOrderModel.find({
    "cartItems.orderStatus": "requested",
    companyId,
  });

  // Generate order notices
  const orderNotices = orders
    .filter((orderItem) =>
      orderItem.cartItems.every((item) => item.orderStatus === "requested")
    )
    .map((orderItem) => ({
      id: orderItem._id,
      message: orderItem.orderNumber,
      type: "order",
      date: orderItem.statusUpdatedAt,
    }));

  res.json({
    status: true,
    count:
      productNotices.length +
      orderNotices.length +
      productQuestionsNotices.length,
    productNotices,
    orderNotices,
    productQuestionsNotices,
  });
});
