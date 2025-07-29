const asyncHandler = require("express-async-handler");
const fingerPrintModel = require("../../models/Hr/fingerprintModel");
const mongoose = require("mongoose");
const ApiError = require("../../utils/apiError");
const fingerprintModel = require("../../models/Hr/fingerprintModel");

//@desc Get list of finger-print
//@route GEt /api/finger-print
//@accsess public just for Admine
exports.getFingerPrint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let mongooseQuery = fingerPrintModel.find({ companyId });

  if (req.query.keyword) {
    const query = {
      $and: [
        {
          $or: [
            {
              name: {
                $regex: req.query.keyword,
                $options: "i",
              },
            },
          ],
        },
      ],
    };
    mongooseQuery = mongooseQuery.find(query);
  }
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });
  const totalItems = await fingerPrintModel.countDocuments({ companyId });

  const totalPages = Math.ceil(totalItems / pageSize);

  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);
  const fingerPrint = await mongooseQuery;

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: fingerPrint.length,
    data: fingerPrint,
  });
});

exports.getLoggedUserFingerPrint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const fingerPrint = await fingerPrintModel.find({
    userID: req.user.id,
    companyId,
  });
  if (!fingerPrint) {
    return next(
      new ApiError(`No fingerPrint found for id ${req.user.id}`, 404)
    );
  }
  res
    .status(200)
    .json({ status: "true", results: fingerPrint.length, data: fingerPrint });
});
//@desc Get list of finger-print
//@route GEt /api/finger-print/:id
//@accsess public just for Admine
exports.getOneFingerPrint = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const fingerPrint = await fingerPrintModel.findOne({
    _id: req.params.id,
    companyId,
  });
  res
    .status(200)
    .json({ status: "true", results: fingerPrint.length, data: fingerPrint });
});
//@desc Post Make the finger print for enter and exit
//@route Post /api/finger-print
//@accsess public just for Employee

exports.createFingerPrint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = padZero(date_ob.getDate());
  let month = padZero(date_ob.getMonth() + 1);
  let year = date_ob.getFullYear();
  let hours = padZero(date_ob.getHours());
  let minutes = padZero(date_ob.getMinutes());
  let seconds = padZero(date_ob.getSeconds());

  const Dates = year + "-" + month + "-" + date;
  const Time = hours + ":" + minutes + ":" + seconds;
  req.body.date = Dates;
  req.body.Time = Time;
  req.body.userID = req.user._id;
  req.body.name = req.user.name;
  req.body.email = req.user.email;

  const fingerPrint = await fingerprintModel.create(req.body);
  res.status(200).json({
    status: "success",
    results: fingerPrint.length,
    data: fingerPrint,
  });
});

//@desc Delete Delete the finger print
//@route Delete /api/finger-print
//@accsess public just for Admin
exports.deleteFingerprint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const fingerPrint = await fingerPrintModel.findByIdAndDelete({
    _id: req.params.id,
    companyId,
  });
  if (!fingerPrint) {
    return next(
      new ApiError(`No fingerPrint by this id ${req.params.id}`, 404)
    );
  }
  res.status(200).json({ status: "true", meesage: "Deleted" });
});

//@desc Update Update the finger print
//@route Update /api/finger-print
//@accsess public just for Admin
exports.updateFingerPrint = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const fingerPrint = await fingerPrintModel.findByIdAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!fingerPrint) {
    return next(
      new ApiError(`No fingerPrint by this id ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    status: "success",
    results: fingerPrint.length,
    data: fingerPrint,
  });
});
