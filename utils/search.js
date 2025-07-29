const expressAsyncHandler = require("express-async-handler");

exports.Search = expressAsyncHandler(async (model, req) => {
  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  // Search for product or qr
  let mongooseQuery = model.find({ archives: { $ne: true } });

  if (req.query.keyword) {
    const query = {
      $and: [
        {
          $or: [
            { name: { $regex: req.query.keyword, $options: "i" } },
            { supplierName: { $regex: req.query.keyword, $options: "i" } },
            { journalName: { $regex: req.query.keyword, $options: "i" } },
            { journalDate: { $regex: req.query.keyword, $options: "i" } },
            { counter: { $regex: req.query.keyword, $options: "i" } },
            { discountName: { $regex: req.query.keyword, $options: "i" } },
            { phoneNumber: { $regex: req.query.keyword, $options: "i" } },
            { invoiceName: { $regex: req.query.keyword, $options: "i" } },
            {
              "fromAccount.name": { $regex: req.query.keyword, $options: "i" },
            },
          ],
        },
        { archives: { $ne: true } },
      ],
    };
    mongooseQuery = mongooseQuery.find(query);
  }
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await model.countDocuments();

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);

  return { totalPages, mongooseQuery };
});
