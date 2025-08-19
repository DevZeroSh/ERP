const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const supplierModel = require("../models/suppliersModel");

const { createPaymentHistory } = require("./paymentHistoryService");

const PaymentHistoryModel = require("../models/paymentHistoryModel");

//Create New Supplier
//rol:Who has rol can create
exports.createSupplier = asyncHandler(async (req, res, next) => {
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  // const nextCounter = (await PurchaseInvoicesModel.countDocuments()) + 1;

  req.body.openingBalance = req.body.TotalUnpaid;
  const supplier = await supplierModel.create(req.body);
  const ts = Date.now();
  const futureTs = ts + 5000;
  const futureDateOb = new Date(futureTs);
  const futureFormattedDate = `${padZero(futureDateOb.getHours())}:${padZero(
    futureDateOb.getMinutes()
  )}:${padZero(futureDateOb.getSeconds())}.${padZero(
    futureDateOb.getMilliseconds(),
    3
  )}`;
  req.body.date = `${req.body.date}T${futureFormattedDate}Z`;

  const test = req.body.TotalUnpaid;
  if (test !== null) {
    const openingBalance = await createPaymentHistory(
      "Opening balance",
      req.body.date,
      req.body.TotalUnpaid,
      supplier.TotalUnpaid,
      "supplier",
      supplier.id,
      "",
      companyId,
      "",
      "",
      req.body.havebalans === "debit" ? "Deposit" : "Withdrawal",
      "Opening balance"
    );

    supplier.openingBalanceId = openingBalance._id;
  }

  res
    .status(201)
    .json({ status: "true", message: "Supplier Inserted", data: supplier });
});

//Get All Suppliers
//@rol: who has rol can Get Suppliers Data
exports.getSuppliers = asyncHandler(async (req, res, next) => {
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
      { email: { $regex: req.query.keyword, $options: "i" } },
      { phoneNumber: { $regex: req.query.keyword, $options: "i" } },

      { supplierName: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const filters = req.query.filters ? JSON.parse(req.query.filters) : [];

  if (Array.isArray(filters) && filters.length > 0) {
    query["tags.name"] = { $in: filters };
  }
  const supplier = await supplierModel
    .find(query)
    .skip(skip)
    .limit(pageSize)
    .populate({
      path: "linkAccount",
      populate: { path: "currency" },
    });
  const totalItems = await supplierModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: totalItems,
    data: supplier,
  });
});

//Get One Supplier
//@rol: who has rol can Get the Supplier's Data
exports.getSupplier = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const supplier = await supplierModel
    .findOne({ _id: id, companyId })
    .populate("linkAccount")
    .populate({
      path: "linkAccount",
      populate: { path: "currency" },
    });

  if (!supplier) {
    return next(new ApiError(`There is no supplier with this id ${id}`, 404));
  }

  res.status(200).json({ status: "true", data: supplier });
});

//Update one Supplier
//@rol: who has rol can update the Supplier's Data
exports.updataSupplier = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const supplier = await supplierModel.findOne({ _id: id, companyId });

  if (!supplier) {
    return next(new ApiError(`There is no supplier with this id ${id}`, 404));
  } else {
    // await editPaymentHistory(
    //   dbName,
    //   supplier.openingBalanceId,
    //   req.body.openingBalance,
    //   req.body.date
    // );
    // req.body.TotalUnpaid =
    //   parseFloat(supplier.TotalUnpaid) +
    //   parseFloat(req.body.openingBalance) -
    //   parseFloat(req.body.openingBalanceBefor);
    // req.body.total =
    //   parseFloat(supplier.total) +
    //   parseFloat(req.body.openingBalance) -
    //   parseFloat(req.body.openingBalanceBefor);
    const updatedSupplier = await supplierModel.findOneAndUpdate(
      { _id: id, companyId },
      req.body,
      {
        new: true,
      }
    );
    // const purchase = await PurchaseInvoicesModel.findOne({
    //   openingBalanceId: supplier.openingBalanceId,
    // });
    // const amountBalance2 =
    //   parseFloat(req.body.openingBalance) -
    //   parseFloat(req.body.openingBalanceBefor);

    // purchase.totalRemainderMainCurrency += amountBalance2;
    // purchase.finalPriceMainCurrency += amountBalance2;
    // purchase.finalPrice += amountBalance2;
    // purchase.totalPriceWitheOutTax += amountBalance2;
    // purchase.totalRemainder += amountBalance2;
    // await purchase.save();
    res.status(200).json({
      status: "true",
      message: "Supplier updated",
      data: updatedSupplier,
    });
  }
});

//Delete One Supplier(Put it in archives)
//@rol:who has rol can Delete the Supplier
exports.deleteSupplier = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const paymentHistory = await PaymentHistoryModel.find({
    supplierId: id,
    companyId,
  });

  if (paymentHistory.length > 0) {
    return next(
      new ApiError(`you have a payment for this supplier ${id}`),
      400
    );
  }
  const supplier = await supplierModel.findByIdAndUpdate(
    { _id: id, companyId },
    { archives: "true" },
    { new: true }
  );

  if (!supplier) {
    return next(new ApiError(`There is no supplier with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", message: "Supplier Deleted" });
  }
});
