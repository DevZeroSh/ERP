const asyncHandler = require("express-async-handler");
const investmentCompanies = require("../models/investmentCompaniesModel");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const { uploadSingleImage } = require("../middlewares/uploadingImage");

exports.uploadInvestmentCompaniesImage = uploadSingleImage("logo");

// Image processing
exports.resizeInvestmentCompaniesImages = asyncHandler(
  async (req, res, next) => {
    const filename = `investmentCompanies-${uuidv4()}-${Date.now()}.webp`;
    if (req.file) {
      await sharp(req.file.buffer)
        .toFormat("webp")
        .webp({ quality: 70 })
        .toFile(`uploads/investmentCompanies/${filename}`);

      // Save image into db
      req.body.logo = filename;
    }

    next();
  }
);

// @desc Create investmentCompanies
// @route POST /api/investmentCompanies
// @access Private
exports.createInvestmentCompanies = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    req.body.companyId = companyId;
    const investCompany = await investmentCompanies.create(req.body);

    res.status(201).json({
      status: true,
      message: "success",
      data: investCompany,
    });
  } catch (error) {
    console.error(`Error creating investmentCompanies: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Get all investmentCompaniess
// @route GET /api/investmentCompanies
// @access Private
exports.getAllInvestmentCompaniess = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const investCompanies = await investmentCompanies.find({ companyId });

    res.status(200).json({
      status: true,
      message: "success",
      data: investCompanies,
    });
  } catch (error) {
    console.error(`Error fetching investmentCompaniess: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Get one investmentCompanies
// @route GET /api/investmentCompanies/:id
// @access Private
exports.getOneInvestmentCompanies = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const investCompany = await investmentCompanies.findOne({
      companyId,
      _id: req.params.id,
    });

    if (!investCompany) {
      return res.status(404).json({
        status: false,
        message: "Investment company not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "success",
      data: investCompany,
    });
  } catch (error) {
    console.error(`Error fetching investmentCompanies: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Update investmentCompanies
// @route PUT /api/investmentCompanies/:id
// @access Private
exports.updateInvestmentCompanies = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    req.body.companyId = companyId;
    const updatedInvestmentCompanies =
      await investmentCompanies.findOneAndUpdate(
        { companyId, _id: req.params.id },
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedInvestmentCompanies) {
      return res.status(404).json({
        status: false,
        message: "Investment company not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "success",
      data: updatedInvestmentCompanies,
    });
  } catch (error) {
    console.error(`Error updating investmentCompanies: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Delete investmentCompanies
// @route DELETE /api/investmentCompanies/:id
// @access Private
exports.deleteInvestmentCompanies = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const deletedinvestmentCompanies =
      await investmentCompanies.findOneAndDelete({
        companyId,
        _id: req.params.id,
      });

    if (!deletedinvestmentCompanies) {
      return res.status(404).json({
        status: false,
        message: "Investment company not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "success",
    });
  } catch (error) {
    console.error(`Error deleting investmentCompanies: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
