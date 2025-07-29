const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const { default: slugify } = require("slugify");
const mongoose = require("mongoose");
const StaffsModel = require("../../models/Hr/staffModel");
const multer = require("multer");
const multerStorage = multer.memoryStorage();
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const SalaryHistoryModel = require("../../models/Hr/salaryHistoryModel");

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
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadImageAndFiles = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "files", maxCount: 5 },
]);

exports.resizeAndSaveFiles = asyncHandler(async (req, res, next) => {
  if (req.files?.profileImage) {
    const file = req.files.profileImage[0];
    const filename = `profileImage-${uuidv4()}-${Date.now()}.png`;

    await sharp(file.buffer)
      .resize({ width: 500 })
      .png({ quality: 50 })
      .toFile(`uploads/profileImage/${filename}`);

    req.body.profileImage = filename;
  }

  if (req.files?.files) {
    req.body.files = [];
    req.files?.files.forEach((file) => {
      const fileExtension = file.originalname.split(".").pop();
      const fileName = `file-${Date.now()}.${fileExtension}`;
      const filePath = `uploads/hrDocs/${fileName}`;

      // Save the file to disk
      require("fs").writeFileSync(filePath, file.buffer);

      req.body.files.push(fileName);
    });
  }

  next();
});

// Get list of Staff
exports.getStaff = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = { companyId };
  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { email: { $regex: req.query.keyword, $options: "i" } },
      { phoneNumber: { $regex: req.query.keyword, $options: "i" } },
    ];
  }
  const totalItems = await StaffsModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);
  const staffs = await StaffsModel.find(query)
    .skip(skip)
    .limit(pageSize)
    .populate("currency")
    .populate("position");

  res.status(200).json({
    status: "success",
    results: totalItems,
    totalPages: totalPages,
    data: staffs,
  });
});

// Create Staffs
exports.createStaff = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.slug = slugify(req.body.name);
  req.body.companyId = companyId;
  req.body.tags = JSON.parse(req.body.tags);
  const Staffs = await StaffsModel.create(req.body);
  res
    .status(201)
    .json({ status: "success", message: "Staffs Inserted", data: Staffs });
});

// Get specific Staffs by id
exports.getOneStaff = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  req.body.companyId = companyId;

  const { id } = req.params;
  const Staffs = await StaffsModel.findById({ _id: id, companyId })
    .populate("currency")
    .populate("position");
  if (!Staffs) {
    return next(new ApiError(`No Staffs found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: Staffs });
});

// Update specific Staffs
exports.updataStaff = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  req.body.tags = JSON.parse(req.body.tags);

  const Staffs = await StaffsModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    req.body,
    {
      new: true,
    }
  );
  if (!Staffs) {
    return next(new ApiError(`No Staffs found for id ${req.params.id}`, 404));
  }
  res
    .status(200)
    .json({ status: "success", message: "Staffs updated", data: Staffs });
});

// Delete specific Staffs
exports.deleteStaff = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const { id } = req.params;
  const StaffsID = await StaffsModel.findOne({ _id: id, companyId });
  let Staffs;
  const salaryHistory = await SalaryHistoryModel.countDocuments({
    employeeId: id,
    companyId,
  });
  if (salaryHistory > 0) {
    Staffs = await StaffsModel.findOneAndUpdate(
      { _id: id, companyId },
      { employmentStatus: !StaffsID.employmentStatus },
      { new: true }
    );
  } else {
    Staffs = await StaffsModel.findOneAndDelete({ _id: id, companyId });
  }

  if (!Staffs) {
    return next(new ApiError(`No Staffs found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", message: "Staffs Deleted" });
});
