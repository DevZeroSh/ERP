const asyncHandler = require("express-async-handler");
const LinkPanelModel = require("../models/linkPanelModel");


exports.getAllLinkPanel = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await LinkPanelModel.countDocuments();

  const totalPages = Math.ceil(totalItems / pageSize);
  const LinkPanel = await LinkPanelModel.find({ companyId })
    .skip(skip)
    .limit(pageSize)
    .populate("accountData")
    .populate({
      path: "accountData",
      populate: { path: "currency" },
    });
  res.status(200).json({
    Pages: totalPages,
    results: LinkPanel.length,
    data: LinkPanel,
  });
});

exports.createLinkPanel = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const LinkPanel = await LinkPanelModel.create(req.body);
  res.status(200).json({ message: "success", data: LinkPanel });
});

exports.updateLinkPanel = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const { id } = req.params;

  const LinkPanel = await LinkPanelModel.findOneAndUpdate(
    { _id: id, companyId },
    req.body,
    {
      new: true,
    }
  );
  res.status(200).json({ message: "success", data: LinkPanel });
});
exports.getLinkPanel = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;

  const LinkPanel = await LinkPanelModel.findOne({ _id: id, companyId })
    .populate("accountData")
    .populate({
      path: "accountData",
      populate: { path: "currency" },
    });
  res.status(200).json({ message: "success", data: LinkPanel });
});
