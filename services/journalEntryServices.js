const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { Search } = require("../utils/search");
const journalModel = require("../models/journalEntryModel");
const AccountModel = require("../models/accountingTreeModel");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
//@desc Get Account Transaction
//@route Get /api/account
exports.getJournals = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = req.query.limit || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const { startDate, endDate } = req.query;

  let query = { companyId };
  if (startDate && endDate) {
    query.journalDate = {
      $gte: startDate + "T00:00:00.000Z",
      $lte: endDate + "T23:59:59.999Z",
    };
  }

  if (req.query.keyword) {
    query.$or = [
      { journalName: { $regex: req.query.keyword, $options: "i" } },
      { journalRefNum: { $regex: req.query.keyword, $options: "i" } },
      { counter: { $regex: req.query.keyword, $options: "i" } },
      { journalDesc: { $regex: req.query.keyword, $options: "i" } },
    ];
  }
  const totalItems = await journalModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  const account = await journalModel
    .find(query)
    .sort({ journalDate: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: account.length,
    data: account,
  });
});

//@desc Get Account Transaction
//@route Get /api/account:id
exports.getOneJournal = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  const account = await journalModel.findOne({ _id: id, companyId });
  if (!account) {
    return next(new ApiError(`not find Transaction in this id: ${id}`, 404));
  }

  res.status(200).json({ data: account });
});

const multerOptions = () => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|webp/;
    const extname = allowedTypes.test(
      file.originalname.toLowerCase().split(".").pop()
    );
    const mimeType = allowedTypes.test(file.mimetype);
    if (extname && mimeType) {
      cb(null, true);
    } else {
      cb(new ApiError("Only images and documents are allowed", 400), false);
    }
  };

  return multer({ storage: multerStorage, fileFilter: multerFilter });
};
const uploadMixOfFiles = (arrayOfFields) =>
  multerOptions().fields(arrayOfFields);

exports.uploadFileAndImagejournal = uploadMixOfFiles([
  { name: "filesArray", maxCount: 5 },
]);

exports.processFilesAndImagesjournal = asyncHandler(async (req, res, next) => {
  if (req.files.filesArray) {
    req.body.filesArray = [];

    req.files.filesArray.forEach((file) => {
      const fileName = `file-${uuidv4()}-${Date.now()}-${file.originalname}`;
      const filePath = `uploads/journal/${fileName}`;

      // Save the file to disk
      require("fs").writeFileSync(filePath, file.buffer);

      req.body.filesArray.push(fileName);
    });
  }

  next();
});

//@desc Create new Account Transaction
//@route post /api/account
exports.createJournal = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;

  const nextCounterPayment =
    (await journalModel.countDocuments({ companyId })) + 1;
  const accountingTreePayment =
    (await journalModel.countDocuments({ companyId })) + 1;

  req.body.journalAccounts = JSON.parse(req.body.journalAccounts);
  req.body.counter = nextCounterPayment;

  req.body.journalRefNum = accountingTreePayment;
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDateAdd = `${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}.${padZero(date_ob.getMilliseconds(), 3)}`;
  const isoDate = `${req.body.journalDate}T${formattedDateAdd}Z`;

  req.body.journalDate = isoDate;

  const create = await journalModel.create(req.body);
  const updateOperations = req.body.journalAccounts.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: {
        $inc: {
          debtor: item.MainDebit || 0,
          creditor: item.MainCredit || 0,
        },
      },
    },
  }));
  await AccountModel.bulkWrite(updateOperations);
  res.status(200).json({
    status: "success",
    data: create,
  });
});

exports.getOneAccountAndJournal = asyncHandler(async (req, res, next) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }
    const { id } = req.params;
    const filters = req.query?.filters ? JSON.parse(req.query?.filters) : {};

    let query = { "journalAccounts.id": id, companyId };
    const pageSize = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * pageSize;

    const account = await AccountModel.findOne({ _id: id, companyId }).populate(
      "currency"
    );
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    if (req.query.keyword) {
      query.$or = [
        { journalName: { $regex: req.query.keyword, $options: "i" } },
        { journalRefNum: { $regex: req.query.keyword, $options: "i" } },
        { counter: { $regex: req.query.keyword, $options: "i" } },
      ];
    }
    const totalItems = await journalModel.countDocuments(query);

    const totalPages = Math.ceil(totalItems / pageSize);
    if (filters?.startDate || filters?.endDate) {
      query.journalDate = {};
      if (filters?.startDate) {
        query.journalDate.$gte = `${filters.startDate}T00:00:00.000Z`;
      }
      if (filters?.endDate) {
        query.journalDate.$lte = `${filters.endDate}T23:59:59.999Z`;
      }
    }

    const allJournals = await journalModel.find(query);

    let runningBalanceMaine = 0;
    let runningBalance = 0;
    const filteredJournals = allJournals
      .sort((a, b) => new Date(a.journalDate) - new Date(b.journalDate))
      .map((journal) => {
        const filteredAccounts = journal.journalAccounts
          .filter((account) => account.id === id)
          .map((accountEntry) => {
            runningBalanceMaine +=
              account.balanceType === "credit"
                ? accountEntry.MainCredit - accountEntry.MainDebit
                : accountEntry.MainDebit - accountEntry.MainCredit;
            runningBalance +=
              account.balanceType === "credit"
                ? accountEntry.accountCredit - accountEntry.accountDebit
                : accountEntry.accountDebit - accountEntry.accountCredit;

            return {
              ...accountEntry.toObject(),
              runningBalanceMaine,
              runningBalance,
            };
          });

        return {
          ...journal.toObject(),
          journalAccounts: filteredAccounts,
          runningBalanceMaine,
          runningBalance,
        };
      });
    const paginatedJournals = filteredJournals
      .sort((a, b) => new Date(b.journalDate) - new Date(a.journalDate))
      .slice(skip, skip + pageSize);

    // 5. Return the response with running balance
    return res.status(200).json({
      Pages: totalPages,
      runningBalanceMaine: runningBalanceMaine,
      runningBalance: runningBalance,
      results: totalItems,
      data: account,
      journals: paginatedJournals,
    });
  } catch (error) {
    next(error);
  }
});

exports.updateJournal = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const journal = await journalModel.findOne({ _id: id, companyId });
  req.body.journalAccounts = JSON.parse(req.body.journalAccounts);
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDateAdd = `${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}.${padZero(date_ob.getMilliseconds(), 3)}`;
  const isoDate = `${req.body.journalDate}T${formattedDateAdd}Z`;

  req.body.journalDate = isoDate;

  const updateJournal = await journalModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );
  const updateOperations = journal.journalAccounts.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: {
        $inc: {
          debtor: -item.MainDebit || 0,
          creditor: -item.MainCredit || 0,
        },
      },
    },
  }));

  await AccountModel.bulkWrite(updateOperations);
  const updateOperations2 = req.body.journalAccounts.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: {
        $inc: {
          debtor: item.MainDebit || 0,
          creditor: item.MainCredit || 0,
        },
      },
    },
  }));
  await AccountModel.bulkWrite(updateOperations2);

  res.status(200).json({
    status: "success",
    message: "Journal Updated",
    data: updateJournal,
  });
});

exports.getOneJournalByLink = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { linkNum } = req.params;

  const journal = await journalModel.findOne({
    linkCounter: linkNum,
    companyId,
  });

  if (!journal) {
    return next(new ApiError(`no journal by linkNum ${linkNum}`, 404));
  }
  res.status(200).json({
    status: "success",
    message: "Journal Updated",
    data: journal,
  });
});

exports.updateJournalForInvoice = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  req.body.journalAccounts = JSON.parse(req.body.journalAccounts);
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const { linkNum } = req.params;
  const journal = await journalModel.findOne({
    linkCounter: linkNum,
    companyId,
  });
  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDateAdd = `${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}.${padZero(date_ob.getMilliseconds(), 3)}`;
  const isoDate = `${req.body.journalDate}T${formattedDateAdd}Z`;

  req.body.journalDate = isoDate;

  const updateJournal = await journalModel.findOneAndUpdate(
    { linkCounter: linkNum, companyId },
    req.body,
    { new: true }
  );
  if (!updateJournal) {
    return next(new ApiError(`No Journal By this id`, 404));
  }
  const updateOperations = journal.journalAccounts
    .filter((item) => item.id)
    .map((item) => ({
      updateOne: {
        filter: { _id: item.id, companyId },
        update: {
          $inc: {
            debtor: -item.MainDebit || 0,
            creditor: -item.MainCredit || 0,
          },
        },
      },
    }));

  await AccountModel.bulkWrite(updateOperations);
  const updateOperations2 = req.body.journalAccounts.map((item) => ({
    updateOne: {
      filter: { _id: item.id, companyId },
      update: {
        $inc: {
          debtor: item.MainDebit || 0,
          creditor: item.MainCredit || 0,
        },
      },
    },
  }));
  await AccountModel.bulkWrite(updateOperations2);
  res.status(200).json({
    status: "success",
    message: "Journal Updated",
    data: updateJournal,
  });
});
