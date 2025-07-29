const asyncHandler = require("express-async-handler");
const salsePointModel = require("../models/salesPointModel");


exports.createSalesPoint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const sales = await salsePointModel.create(req.body);

  res.status(200).json({ status: "success", data: sales });
});

exports.getSalesPoint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const sales = await salsePointModel
    .find({ companyId })
    .populate("salesPointCurrency");
  res.status(200).json({ status: "success", data: sales });
});

exports.getOneSalePoint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const sales = await salsePointModel
    .findOne({ _id: id, companyId })
    .populate("salesPointCurrency");
  res.status(200).json({ status: "success", data: sales });
});

exports.updateSalePoint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;
  const sales = await salsePointModel.findByIdAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );
  res.status(200).json({ status: "success", data: sales });
});

exports.openAndCloseSalePoint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const open = await salesPointModel.findOneAndUpdate(
    { _id: id, companyId },
    {
      isOpen: req.body.isOpen,
    }
  );

  // if (req.body.isOpen === false) {
  //   margeOrderFish(dbName, id);
  // }
  res.status(200).json({ status: "success", data: open });
});

// const margeOrderFish = asyncHandler(async (databaseName, id) => {
//   const db = mongoose.connection.useDb(databaseName);
//   db.model("Employee", emoloyeeShcema);
//   db.model("FinancialFunds", financialFundsSchema);
//   db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
//   db.model("Product", productSchema);
//   db.model("ReportsSales", ReportsSalesSchema);
//   const orderModel = db.model("Sales", orderSchema);
//   const salsePos = db.model("orderFishPos", orderFishSchema);

//   function padZero(value) {
//     return value < 10 ? `0${value}` : value;
//   }
//   let ts = Date.now();
//   let date_ob = new Date(ts);
//   let date = padZero(date_ob.getDate());
//   let month = padZero(date_ob.getMonth() + 1);
//   let year = date_ob.getFullYear();
//   let hours = padZero(date_ob.getHours());
//   let minutes = padZero(date_ob.getMinutes());
//   let seconds = padZero(date_ob.getSeconds());

//   const formattedDate =
//     year +
//     "-" +
//     month +
//     "-" +
//     date +
//     " " +
//     hours +
//     ":" +
//     minutes +
//     ":" +
//     seconds;
//   const specificDate = new Date();
//   const specificDateString = specificDate.toISOString().split("T")[0];

//   // Find orders where paidAt matches the specified date and type is 'pos'
//   const orders = await salsePos.find({
//     paidAt: {
//       $gte: specificDateString,
//     },
//     salesPoint: id,
//     type: "pos",
//   });
//   const cartItems = [];
//   const fish = [];
//   let totalOrderPrice = 0;

//   const financialFundsMap = new Map();

//   for (const order of orders) {
//     order.cartItems.forEach((item) => {
//       cartItems.push({
//         qr: item.qr,
//         name: item.name,
//         sellingPrice: item.taxPrice,
//         soldQuantity: item.quantity,
//         orginalBuyingPrice: item.buyingPrice,
//         convertedBuyingPrice: item.buyingPrice,
//         total: item.taxPrice * item.quantity,
//         totalWithoutTax: item.price * item.quantity,
//         tax: { _id: "", tax: item.taxRate },
//       });
//       fish.push(order.counter);
//       totalOrderPrice += item.taxPrice * item.quantity;
//     });
//     // await order.financialFunds?.forEach((fund) => {
//     //   const fundId = fund.fundId.toString();

//     //   if (financialFundsMap.has(fundId)) {
//     //     financialFundsMap.get(fundId).allocatedAmount += fund.allocatedAmount;
//     //   } else {
//     //     financialFundsMap.set(fundId, {
//     //       fundId: fund?.fundId,
//     //       allocatedAmount: fund?.allocatedAmount || 0,
//     //       exchangeRate: fund?.exchangeRate,
//     //       exchangeRateIcon: fund?.exchangeRateIcon,
//     //       fundName: fund?.fundName,
//     //     });
//     //   }
//     // });

//     if (order.onefinancialFunds) {
//       const fundId = order.onefinancialFunds.toString();
//       if (financialFundsMap.has(fundId)) {
//         financialFundsMap.get(fundId).allocatedAmount +=
//           order.priceExchangeRate;
//       } else {
//         financialFundsMap.set(fundId, {
//           fundId: fundId,
//           allocatedAmount: order.priceExchangeRate || 0,
//         });
//       }
//     }
//   }
//   // Convert the map of financial funds to an array
//   const aggregatedFunds = Array.from(financialFundsMap.values());

//   const nextCounter = (await orderModel.countDocuments()) + 1;

//   const newOrderData = {
//     invoicesItems: cartItems,
//     invoiceGrandTotal: totalOrderPrice,
//     orderDate: formattedDate,
//     type: "bills",
//     totalInMainCurrency: totalOrderPrice,
//     counter: nextCounter,
//     paymentsStatus: "paid",
//     exchangeRate: 1,
//     fish: fish,
//     financialFunds: aggregatedFunds,
//   };

//   const newOrders = await orderModel.insertMany(newOrderData);
// });
