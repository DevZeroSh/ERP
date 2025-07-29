const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const customersModel = require("../models/customarModel");
const { Search } = require("../utils/search");
const bcrypt = require("bcrypt");
const createToken = require("../utils/createToken");
const {
  createPaymentHistory,
  editPaymentHistory,
} = require("./paymentHistoryService");
const orderSchema = require("../models/orderModel");
const xlsx = require("xlsx");
const AccountingTreeSchema = require("../models/accountingTreeModel");
const currencySchema = require("../models/currencyModel");
const PaymentHistoryModel = require("../models/paymentHistoryModel");

//Create New Customar
//@rol: Who has rol can create
exports.createCustomar = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const ts = Date.now();

  const futureDateOb = new Date(ts);
  futureDateOb.setSeconds(futureDateOb.getSeconds() + 1);

  const futureFormattedDate = `${padZero(futureDateOb.getHours())}:${padZero(
    futureDateOb.getMinutes()
  )}:${padZero(futureDateOb.getSeconds())}.${padZero(
    futureDateOb.getMilliseconds(),
    3
  )}`;
  req.body.date = `${req.body.date}T${futureFormattedDate}Z`;

  req.body.openingBalance = req.body.TotalUnpaid;

  const customar = await customersModel.create(req.body);
  if (req.body.TotalUnpaid !== null) {
    const openingBalance = await createPaymentHistory(
      "Opening balance",
      req.body.date || formattedDate,
      req.body.TotalUnpaid,
      customar.TotalUnpaid,
      "customer",
      customar.id,
      "",
      companyId,
      "",
      "",
      req.body.havebalans === "debit" ? "Deposit" : "Withdrawal",
      "Opening balance"
    );
    customar.openingBalanceId = openingBalance._id;
    await customar.save();
  }

  res
    .status(201)
    .json({ status: "true", message: "Customar Inserted", data: customar });
});

//Get All Customars
//@rol: who has rol can Get Customars Data
exports.getCustomars = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const filters = req.query?.filters ? JSON.parse(req.query?.filters) : {};

  const pageSize = req.query.limit || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { companyId };
  if (req.query.keyword) {
    query.$or = [
      { email: { $regex: req.query.keyword, $options: "i" } },
      { phoneNumber: { $regex: req.query.keyword, $options: "i" } },

      { name: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  if (filters?.length) {
    query["tags.name"] = { $in: filters };
  }
  const customars = await customersModel
    .find(query)
    .skip(skip)
    .limit(pageSize)
    .populate("linkAccount")
    .populate({
      path: "linkAccount",
      populate: { path: "currency" },
    });
  const totalItems = await customersModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);
  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: totalItems,
    data: customars,
  });
});

//Get One Customar
//@rol: who has rol can Get the Customar's Data
exports.getCustomar = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const customar = await customersModel
    .findOne({ _id: id, companyId })
    .populate("linkAccount")
    .populate({
      path: "linkAccount",
      populate: { path: "currency" },
    });

  if (!customar) {
    return next(new ApiError(`There is no customar with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", data: customar });
  }
});

//Update one Customar
//@rol: who has rol can update the Customar's Data
exports.updataCustomar = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const customar = await customersModel.findOne({ _id: id, companyId });

  if (!customar) {
    return next(new ApiError(`There is no customar with this id ${id}`, 404));
  } else {
    const updatedCustomar = await customersModel.findByIdAndUpdate(
      { _id: id, companyId },
      req.body,
      {
        new: true,
      }
    );

    res.status(200).json({
      status: "true",
      message: "Customar updated",
      data: updatedCustomar,
    });
  }
});

exports.updateCustomerPassword = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  // Update user password based on user payload (req.user._id)
  const user = await customersModel.findOneAndUpdate(
    { _id: req.user._id, companyId },
    {
      password: await bcrypt.hash(req.body.newPassword, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!user) {
    return new ApiError("User not found", 404);
  }

  // Generate Token
  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
});

//Delete One Customar(Put it in archives)
//@rol:who has rol can Delete the Customar
exports.deleteCustomar = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const paymentHistory = await PaymentHistoryModel.find({
    customerId: id,
    companyId,
  });

  if (paymentHistory.length > 0) {
    return next(
      new ApiError(`you have a payment for this customer ${id}`),
      400
    );
  }

  const customar = await customersModel.findOneAndDelete({
    _id: id,
    companyId,
  });

  if (!customar) {
    return next(new ApiError(`There is no customer with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", message: "Customer Deleted" });
  }
});

// desc imports

// exports.importCustomer = asyncHandler(async (req, res, next) => {
//   const companyId = req.query.companyId;

//   if (!companyId) {
//     return res.status(400).json({ message: "companyId is required" });
//   }

//   // Check if file is provided
//   if (!req.file) {
//     return res.status(400).json({ error: "No file uploaded" });
//   }

//   const { buffer } = req.file;
//   let csvData;

//   // Handle CSV and XLSX file types
//   if (
//     req.file.originalname.endsWith(".csv") ||
//     req.file.mimetype === "text/csv"
//   ) {
//     csvData = await csvtojson().fromString(buffer.toString());
//   } else if (
//     req.file.originalname.endsWith(".xlsx") ||
//     req.file.mimetype ===
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//   ) {
//     const workbook = xlsx.read(buffer, { type: "buffer" });
//     const sheet_name_list = workbook.SheetNames;
//     csvData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
//   } else {
//     return res.status(400).json({ error: "Unsupported file type" });
//   }

//   // Get current customer count to generate the next code
//   const currentCount = await customersModel.countDocuments();
//   let nextCode = 112001 + currentCount;

//   // Add code to each customer record
//   csvData = csvData.map((client) => {
//     client.code = nextCode++;
//     return client;
//   });

//   try {
//     // Insert customers into the database
//     const insertedCustomers = await customersModel.insertMany(csvData, {
//       ordered: false,
//     });

//     res.status(200).json({
//       success: true,
//       message: "Customers imported successfully",
//       data: insertedCustomers,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// });
