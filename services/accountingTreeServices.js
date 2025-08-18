const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const AccountingTree = require("../models/accountingTreeModel");
const ApiError = require("../utils/apiError");
const xlsx = require("xlsx");
const currencySchema = require("../models/currencyModel");

exports.getAccountingTree = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const type = req.params.id;
    const filter = type
      ? { companyId, $or: [{ code: type }, { accountType: type }] }
      : { companyId };

    // Use aggregation pipeline to sort by numeric code safely
    const accounts = await AccountingTree.aggregate([
      { $match: filter },
      {
        $addFields: {
          numericCode: {
            $convert: {
              input: "$code",
              to: "double", // Supports both integers and decimals
              onError: null, // Prevents errors if conversion fails
              onNull: null, // Handles null values gracefully
            },
          },
        },
      },
      { $sort: { numericCode: 1 } },
      {
        $lookup: {
          from: "currencies",
          localField: "currency",
          foreignField: "_id",
          as: "currency",
        },
      },
      { $unwind: { path: "$currency", preserveNullAndEmptyArrays: true } },
    ]);

    const buildTree = (data, parentCode = null) => {
      return data
        .filter((item) => item.parentCode === parentCode)
        .map((item) => {
          const children = buildTree(data, item.code);
          const initialBalance = item.balance || 0;
          const totalChildBalance = children.reduce(
            (sum, child) => sum + (child.balance || 0),
            0
          );

          return {
            ...item,
            balance: initialBalance + totalChildBalance,
            children: children.length > 0 ? children : [],
          };
        });
    };

    const treeData = buildTree(accounts);
    res.status(200).json({ status: "success", data: treeData });
  } catch (error) {
    next(error);
  }
});

exports.getAccountingTreeNoBalance = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const account = await AccountingTree.find({ companyId }).sort({ code: -1 });

  res.status(200).json({ results: account.length, data: account });
});

exports.getAccountingTreeForExport = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const account = await AccountingTree.find({ companyId })
    .populate("currency")
    .sort({ code: 1 });

  res.status(200).json({ results: account.length, data: account });
});

exports.createAccountingTree = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const createAccount = await AccountingTree.create(req.body);

  res.status(200).json({ status: "success", data: createAccount });
});

exports.updateAccountingTree = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;
  const updateTree = await AccountingTree.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );

  res.status(200).json({ status: "success", data: updateTree });
});

exports.getAccountingTreeByCode = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const type = req.params.id;
  const getAllAccount = await AccountingTree.find({
    companyId,
    $or: [{ code: type }, { accountType: type }],
  });
  res.status(200).json({ status: "success", data: getAllAccount });
});

exports.deleteAccountingTree = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const { id } = req.params;

  const accountingTree = await AccountingTree.find({
    companyId,
    $or: [{ code: id }, { parentCode: id }],
  });

  if (!accountingTree) {
    return next(new ApiError(`not fund the account Tree for this code ${id}`));
  }

  if (
    accountingTree.length === 1 &&
    accountingTree[0].debtor === 0 &&
    accountingTree[0].creditor === 0
  ) {
    const deleteAccountTree = await AccountingTree.deleteOne({ code: id });
  } else if (accountingTree.length > 1) {
    return next(new ApiError(`this Account ${id} have Children`));
  } else if (accountingTree.debtor !== 0 || accountingTree.creditor !== 0) {
    return next(new ApiError(`this Account ${id} have Finincial operations`));
  } else {
    return next(new ApiError(`this Account ${id} have not been found`));
  }
  res.status(200).json({
    status: "true",
    meesage: "deleted",
  });
});

exports.importAccountingTree = asyncHandler(async (req, res, next) => {
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
  for (const item of csvData) {
    // Find IDs for currency, category, unit, and brand
    const currency = await currencySchema.findOne({
      companyId,
      currencyName: item.currency,
    });
    item.currency = currency?._id;
    item.companyId = companyId;
  }
  try {
    console.log(csvData);

    // Insert Tree into the database
    const insertedTree = await AccountingTree.insertMany(csvData, {
      ordered: false,
    });

    res.status(200).json({
      status: "success",
      message: "Tree imported successfully",
      data: insertedTree,
    });
  } catch (error) {
    res.status(500).json({
      status: "faild",
      error: error.message,
    });
  }
});

exports.changeBalance = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  const account = await AccountingTree.findOneAndUpdate(
    { _id: id, companyId: companyId },
    {
      $inc: { debtor: req.body.debtor || 0, creditor: req.body.creditor || 0 },
    },
    { new: true }
  );

  res
    .status(200)
    .json({ status: "success", message: "balance Updated", data: account });
});

exports.getOneAccountingTree = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  const findOneAccount = await AccountingTree.findOne({
    _id: id,
    companyId,
  });

  res.status(200).json({ status: "success", data: findOneAccount });
});
