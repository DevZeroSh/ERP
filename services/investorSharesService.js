const asyncHandler = require("express-async-handler");
const InvestorShares = require("../models/investorSharesModel");
const investmentCompanies = require("../models/investmentCompaniesModel");

// @desc Create investorShares
// @route POST /api/investorShares
// @access Private
exports.createinvestorShares = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    req.body.companyId = companyId;
    const investorShare = await investorShares.create(req.body);

    // Respond with success message and created investor data
    res.status(201).json({
      status: true,
      message: "success",
      data: investorShare,
    });
  } catch (error) {
    // Handle errors
    console.error(`Error creating investorShares: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Get all investorShares
// @route GET /api/investorShares
// @access Private
exports.getAllinvestorShares = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { keyword, page = 1, limit = 10, sort = "-createdAt" } = req.query;

  try {
    let query = { companyId };

    if (keyword && keyword.trim() !== "") {
      const matchingCompanies = await investmentCompanies
        .find({
          name: { $regex: keyword, $options: "i" },
        })
        .select("_id");
      const companyIds = matchingCompanies.map((company) => company._id);
      query.investmentCompanies = { $in: companyIds };
    }

    const skip = (page - 1) * limit;

    const [shares, total] = await Promise.all([
      InvestorShares.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: "investmentCompanies",
          select: "name _id",
          match: keyword ? { name: { $regex: keyword, $options: "i" } } : {},
        })
        .populate({
          path: "investor",
          select: "_id",
        }),

      InvestorShares.countDocuments(query),
    ]);

    const filteredShares = keyword
      ? shares.filter((share) => share.investmentCompanies !== null)
      : shares;

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: true,
      message: "success",
      pagination: {
        totalItems: total,
        totalPages,
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: filteredShares,
    });
  } catch (error) {
    console.error(`Error while fetching investor shares: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// @desc Get one investorShares
// @route GET /api/investorShares/:id
// @access Private
exports.getOneInvestorShares = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const investorShare = await investorShares.findById(req.params.id);

    if (!investorShare) {
      return res.status(404).json({
        status: false,
        message: "investorShares not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "success",
      data: investorShare,
    });
  } catch (error) {
    console.error(`Error fetching investorShares: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Update investorShares
// @route PUT /api/investorShares/:id
// @access Private
exports.updateInvestorSharesModel = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const updatedinvestorShares = await investorShares.findOneAndUpdate(
      { companyId, _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedinvestorShares) {
      return res.status(404).json({
        status: false,
        message: "Investor not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "success",
      data: updatedinvestorShares,
    });
  } catch (error) {
    console.error(`Error updating investorShares: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});

// @desc Delete investorShares
// @route DELETE /api/investorShares/:id
// @access Private
exports.deleteInvestorShares = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  try {
    const deletedinvestorShares = await investorShares.findOneAndDelete({
      companyId,
      _id: req.params.id,
    });

    if (!deletedinvestorShares) {
      return res.status(404).json({
        status: false,
        message: "investorShares not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "success",
    });
  } catch (error) {
    console.error(`Error deleting investorShares: ${error.message}`);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});
