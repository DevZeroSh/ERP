const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const PurchaseInvoicesModel = require("../models/purchaseinvoicesModel");
const suppliersModel = require("../models/suppliersModel");
const financialFundsModel = require("../models/financialFundsModel");
const productModel = require("../models/productModel");

const taxModel = require("../models/taxModel");
const reportsFinancialFunds = require("../models/reportsFinancialFunds");
const refundPurchaseInviceModel = require("../models/refundPurchaseInviceModel");

const { createProductMovement } = require("../utils/productMovement");
const { createInvoiceHistory } = require("./invoiceHistoryService");
const { createPaymentHistory } = require("./paymentHistoryService");
const stockModel = require("../models/stockModel");
const PaymentModel = require("../models/paymentModel");
const paymentHistoryModel = require("../models/paymentHistoryModel");
const invoiceHistoryModel = require("../models/invoiceHistoryModel");
const unTracedproductLogModel = require("../models/unTracedproductLogModel");
const multer = require("multer");

//Fixed Ourchse invoice
const multerStorage = multer.diskStorage({
  destination: function (req, file, callback) {
    // Specify the destination folder for storing the files
    callback(null, "./uploads/invoice");
  },
  filename: function (req, file, callback) {
    // Specify the filename for the uploaded file
    const originalname = file.originalname;
    const lastDotIndex = originalname.lastIndexOf(".");
    const fileExtension =
      lastDotIndex !== -1 ? originalname.slice(lastDotIndex + 1) : "";
    const filename = `file-${Date.now()}.${fileExtension}`;

    callback(null, filename);
  },
});

const upload = multer({
  storage: multerStorage,
  fileFilter: (req, file, callback) => {
    const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new ApiError("Invalid file type. Only images and PDFs are allowed.")
      );
    }
  },
});

exports.uploadFile = upload.single("file");
exports.findAllProductInvoices = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const filters = req.query?.filters ? JSON.parse(req.query?.filters) : {};

  const pageSize = req.query.limit || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { type: { $ne: "openingBalance" }, companyId };

  if (filters?.startDate || filters?.endDate) {
    query.date = {};
    if (filters?.startDate) {
      query.date.$gte = filters.startDate;
    }
    if (filters?.endDate) {
      query.date.$lte = filters.endDate;
    }
  }
  if (filters?.tags?.length) {
    const tagIds = filters.tags.map((tag) => tag.id);
    query["tag.id"] = { $in: tagIds };
  }
  if (filters.paymentStatus) {
    query.paid = filters.paymentStatus;
  }
  if (filters.employee) {
    query.employee = filters.employee;
  }
  if (filters?.businessPartners) {
    query["supllier.name"] = {
      $regex: filters.businessPartners,
      $options: "i",
    };
  }
  if (req.query.keyword) {
    query.$or = [
      {
        "supllier.name": { $regex: req.query.keyword, $options: "i" },
      },
      {
        invoiceName: { $regex: req.query.keyword, $options: "i" },
      },
      {
        invoiceNumber: { $regex: req.query.keyword, $options: "i" },
      },
    ];
  }
  if (filters?.filterTags?.length) {
    query["tag.name"] = { $in: filters.filterTags };
  }
  const totalItems = await PurchaseInvoicesModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);
  const purchaseInvoices = await PurchaseInvoicesModel.find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({
      path: "employee",
      select: "name profileImg email phone",
    });

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: purchaseInvoices.length,
    data: purchaseInvoices,
  });
});

exports.findOneProductInvoices = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  const ProductInvoices = await PurchaseInvoicesModel.findOne({
    _id: id,
    companyId,
  })
    .populate({
      path: "employee",
      select: "name profileImg email phone",
    })
    .populate("invoicesItems.tax");

  if (!ProductInvoices) {
    return next(new ApiError(`No ProductInvoices for this id ${id}`, 404));
  }
  const pageSize = req.query.limit || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await invoiceHistoryModel.countDocuments({
    invoiceId: id,
  });

  const totalPages = Math.ceil(totalItems / pageSize);
  const invoiceHistory = await invoiceHistoryModel
    .find({
      invoiceId: id,
      companyId,
    })
    .populate({ path: "employeeId", select: "name email" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    data: ProductInvoices,
    history: invoiceHistory,
  });
});

exports.createPurchaseInvoice = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const nextCounterPayment =
    (await PaymentModel.countDocuments({ companyId })) + 1;
  const nextCounterPurchaseInvoices =
    (await PurchaseInvoicesModel.countDocuments({ companyId })) + 1;

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  req.body.file = req.file?.filename;

  const ts = Date.now();
  const futureDateOb = new Date(ts);
  futureDateOb.setSeconds(futureDateOb.getSeconds() + 1);

  const futureFormattedDate = `${padZero(futureDateOb.getHours())}:${padZero(
    futureDateOb.getMinutes()
  )}:${padZero(futureDateOb.getSeconds())}.${padZero(
    futureDateOb.getMilliseconds(),
    3
  )}`;

  const date_ob = new Date(ts);
  const formattedDate = `${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}.${padZero(date_ob.getMilliseconds(), 3)}`;

  req.body.paymentDate = `${req.body.paymentDate}T${futureFormattedDate}Z`;

  const {
    paid,
    exchangeRate,
    totalInMainCurrency: totalPurchasePriceMainCurrency,

    invoiceNumber,
    invoiceSubTotal,
    invoiceDiscount,
    invoiceGrandTotal,
    ManualInvoiceDiscount,
    ManualInvoiceDiscountValue,
    invoiceName,
    paymentInFundCurrency,
    InvoiceDiscountType,
    subtotalWithDiscount,
    paymentDate,
    invoiceTax,
    counter,
  } = req.body;
  const isopurchasDate = `${req.body.date}T${formattedDate}Z`;
  req.body.date = isopurchasDate;
  let supplier,
    invoicesItem,
    newPurchaseInvoice,
    supllierObject,
    taxDetails,
    financailFund,
    tag,
    currency;
  supllierObject = req.body.supllierObject
    ? JSON.parse(req.body.supllierObject)
    : "";
  taxDetails = req.body.taxDetails ? JSON.parse(req.body.taxDetails) : "";
  invoicesItem = req.body.invoicesItems
    ? JSON.parse(req.body.invoicesItems)
    : "";
  currency = req.body.currency ? JSON.parse(req.body.currency) : "";
  tag = req.body.tag ? JSON.parse(req.body.tag) : "";

  supplier = await suppliersModel.findOne({
    _id: supllierObject.id,
    companyId,
  });

  const productQRCodes = invoicesItem.map((item) => item.qr);
  const products = await productModel.find({
    qr: { $in: productQRCodes },
    companyId,
  });

  // Create a map for quick product lookups by QR code
  const productMap = new Map(products.map((prod) => [prod.qr, prod]));

  // Prepare and update invoice items with product data

  // Handle invoice creation based on 'paid' status
  if (req.body.paid === "paid") {
    // Handle paid invoice logic
    req.body.status = "paid";
    if (req.body.totalRemainderMainCurrency > 0.3) {
      req.body.paid = "unpaid";
    }
    financailFund = JSON.parse(req.body.financailFund);

    const financialFund = await financialFundsModel.findOne({
      _id: financailFund.id,
      companyId,
    });
    if (!financialFund) throw new Error("Financial fund not found");

    financialFund.fundBalance -= paymentInFundCurrency;

    newPurchaseInvoice = await PurchaseInvoicesModel.create({
      employee: req.user._id,
      invoicesItems: invoicesItem,
      date: req.body.date || formattedDate,
      supllier: supllierObject,
      currency,
      exchangeRate,
      financailFund,
      invoiceNumber,
      paid: req.body.paid,
      totalPurchasePriceMainCurrency,
      invoiceSubTotal,
      invoiceDiscount,
      invoiceGrandTotal,
      taxDetails,
      invoiceName,
      paymentInFundCurrency: paymentInFundCurrency,
      ManualInvoiceDiscount,
      ManualInvoiceDiscountValue,
      InvoiceDiscountType,
      subtotalWithDiscount,
      paymentDate,
      invoiceTax,
      counter: counter + "" + nextCounterPurchaseInvoices,
      tag,
      journalCounter: req.body.journalCounter,
      type: "purchase",
      description: req.body.description,
      totalRemainder: req.body.totalRemainder,
      totalRemainderMainCurrency: req.body.totalRemainderMainCurrency,
      file: req.body.file,
      companyId,
    });
    // Use Promise.all for parallel database operations

    const payment = await PaymentModel.create({
      supplierId: supllierObject.id,
      supplierName: supllierObject.name,
      total: req.body.paymentInInvoiceCurrency,
      totalMainCurrency: req.body.paymentInMainCurrency,
      paymentInFundCurrency: paymentInFundCurrency,
      exchangeRate: financialFund.fundCurrency.exchangeRate,
      financialFundsCurrencyCode: financailFund.code,
      date: req.body.paymentDate || formattedDate,
      financialFundsName: financialFund.fundName,
      financialFundsId: financailFund.id,
      invoiceNumber: counter + "" + invoiceNumber,
      invoiceID: newPurchaseInvoice._id,
      counter: counter + "" + nextCounterPayment,
      description: req.body.paymentDescription,
      invoiceCurrencyCode: req.body.currency.currencyCode,
      paymentText: "Withdrawal",
      type: "purchase",
      companyId,
      payid: {
        id: newPurchaseInvoice._id,
        status: req.body.paid,
        invoiceTotal: req.body.invoiceGrandTotal,
        invoiceName: req.body.invoiceName,
        invoiceCurrencyCode: req.body.currency.currencyCode,
        paymentInFundCurrency: paymentInFundCurrency,
        paymentMainCurrency: req.body.paymentInMainCurrency,
        paymentInInvoiceCurrency: req.body.paymentInInvoiceCurrency,
      },
    });
    const reports = await reportsFinancialFunds.create({
      date: req.body.paymentDate || formattedDate,
      ref: newPurchaseInvoice._id,
      amount: paymentInFundCurrency,
      type: "purchase",
      exchangeRate,
      financialFundId: financailFund.id,
      financialFundRest: financialFund.fundBalance,
      paymentType: "Withdrawal",
      payment: payment._id,
      description: req.body.paymentDescription,
      companyId,
    });
    await newPurchaseInvoice.payments.push({
      payment: paymentInFundCurrency,
      paymentMainCurrency: req.body.paymentInMainCurrency,
      financialFunds: financialFund.fundName,
      financialFundsCurrencyCode: financailFund.code,
      date: req.body.paymentDate || formattedDate,
      paymentID: payment._id,
      paymentInInvoiceCurrency: req.body.paymentInInvoiceCurrency,
      financialFundsId: financailFund.id,
    });

    // Assign reports balance ID after the report is created
    newPurchaseInvoice.reportsBalanceId = reports.id;
    await newPurchaseInvoice.save();
    // Update supplier and financial fund balances
    supplier.total += Number(totalPurchasePriceMainCurrency) || 0;
    supplier.TotalUnpaid =
      Number(supplier.TotalUnpaid) +
        Number(req.body.totalRemainderMainCurrency) || 0;
    await createPaymentHistory(
      "payment",
      req.body.paymentDate || formattedDate,
      req.body.paymentInMainCurrency,
      paymentInFundCurrency,
      "supplier",
      supllierObject.id,
      newPurchaseInvoice._id,
      companyId,
      req.body.paymentDescription,
      payment._id,
      "Deposit",
      "purchase",
      financailFund.code
    );

    await financialFund.save();
  } else {
    // Handle unpaid invoice logic
    let total = Number(totalPurchasePriceMainCurrency);
    // if (supplier.TotalUnpaid <= -1) {
    //   const t = total + supplier.TotalUnpaid;
    //   if (t > 0) {
    //     total = t;
    //     supplier.TotalUnpaid = t;
    //   } else if (t < 0) {
    //     supplier.TotalUnpaid = t;
    //     req.body.paid = "paid";
    //   } else {
    //     total = 0;
    //     supplier.TotalUnpaid = 0;
    //     req.body.paid = "paid";
    //   }
    // } else {
    //   supplier.TotalUnpaid += total;
    // }
    supplier.TotalUnpaid += total;

    supplier.total += total || 0;

    newPurchaseInvoice = await PurchaseInvoicesModel.create({
      employee: req.user._id,
      date: req.body.date || formattedDate,
      invoicesItems: invoicesItem,
      supllier: supllierObject,
      currency,
      exchangeRate,
      financailFund,
      invoiceNumber,
      paid: "unpaid",
      totalPurchasePriceMainCurrency,
      invoiceSubTotal,
      invoiceDiscount,
      totalRemainder: req.body.totalRemainder,
      totalRemainderMainCurrency: req.body.totalRemainderMainCurrency,
      invoiceGrandTotal,
      taxDetails,
      invoiceName,
      ManualInvoiceDiscount,
      ManualInvoiceDiscountValue,
      InvoiceDiscountType,
      subtotalWithDiscount,
      paymentDate,
      invoiceTax,
      tag,
      counter: counter + "" + nextCounterPurchaseInvoices,
      journalCounter: req.body.journalCounter,
      type: "purchase",
      dueDate: paymentDate,
      description: req.body.description,
      file: req.body.file,
      companyId,
    });
  }

  const bulkProductUpdates = invoicesItem
    .filter(
      (item) => item.type !== "unTracedproduct" && item.type !== "expense"
    )
    .map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id, companyId },
        update: {
          $inc: {
            quantity: +item.quantity,
            "stocks.$.productQuantity": +item.quantity,
          },
          $set: { buyingprice: item.orginalBuyingPrice },
        },
      },
    }));

  const bulkProductInserts = invoicesItem
    .filter(
      (item) => item.type !== "unTracedproduct" && item.type !== "expense"
    )
    .map((item) => ({
      updateOne: {
        filter: {
          qr: item.qr,
          "stocks.stockId": { $ne: item.stock._id },
          companyId,
        },
        update: {
          $inc: { quantity: +item.quantity },
          $set: { buyingprice: item.orginalBuyingPrice },
          $push: {
            stocks: {
              stockId: item.stock._id,
              stockName: item.stock.stock,
              productQuantity: item.quantity,
            },
          },
        },
      },
    }));

  await productModel.bulkWrite([...bulkProductUpdates, ...bulkProductInserts]);

  const movementMap = new Map();
  for (const item of invoicesItem) {
    if (item.type === "unTracedproduct" || item.type === "expense") continue;

    const existing = movementMap.get(item.qr);
    if (!existing) {
      movementMap.set(item.qr, { ...item });
    } else {
      existing.quantity += item.quantity;
      existing.orginalBuyingPrice = item.orginalBuyingPrice;
    }
  }
  await Promise.all(
    Array.from(movementMap.entries()).map(async ([qr, item]) => {
      const product = productMap.get(qr);
      if (!product) return;

      const totalStockQuantity = product.stocks.reduce(
        (total, stock) => total + stock.productQuantity,
        0
      );

      await createProductMovement(
        product._id,
        newPurchaseInvoice._id,
        totalStockQuantity + item.quantity,
        item.quantity,
        0,
        0,
        "movement",
        "in",
        "purchase",
        companyId
      );

      if (item.orginalBuyingPrice !== product.buyingprice) {
        await createProductMovement(
          product._id,
          newPurchaseInvoice._id,
          0,
          0,
          item.orginalBuyingPrice,
          product.buyingprice,
          "price",
          "in",
          "purchase",
          companyId
        );
      }
    })
  );

  const bulkSupplierPromises = invoicesItem.map(async (item) => {
    const product = productMap.get(item.qr);
    const updates = [];

    if (product) {
      if (!product.suppliers.includes(supllierObject.id)) {
        product.suppliers.push(supllierObject.id);
        updates.push(product.save());
      }
    } else if (item.type === "unTracedproduct") {
      await unTracedproductLogModel.create({
        name: item.name,
        buyingPrice: item.convertedBuyingPrice || item.orginalBuyingPrice,
        type: "purchase",
        quantity: item.quantity,
        tax: item.tax,
        totalWithoutTax: item.totalWithoutTax,
        total: item.total,
        companyId,
      });
    } else if (item.type === "expense") {
      console.log("Hi");
    }

    return Promise.all(updates);
  });

  await Promise.all(bulkSupplierPromises);

  await supplier.save();
  await createPaymentHistory(
    "invoice",
    req.body.date || formattedDate,
    totalPurchasePriceMainCurrency,
    invoiceGrandTotal,
    "supplier",
    supllierObject.id,
    newPurchaseInvoice._id,
    companyId,
    req.body.description,
    "",
    "",
    "",
    currency.currencyCode
  );

  createInvoiceHistory(
    companyId,
    newPurchaseInvoice._id,
    "create",
    req.user._id,
    req.body.date
  );
  res.status(201).json({
    status: "success",
    message: "Invoice created successfully",
    data: newPurchaseInvoice,
  });
});

exports.updatePurchaseInvoices = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const nextCounterPayment =
    (await PaymentModel.countDocuments({ companyId })) + 1;
  const { id } = req.params;
  const purchase = await PurchaseInvoicesModel.findOne({ _id: id, companyId });
  if (!purchase) {
    return res.status(404).json({ message: "Purchase invoice not found" });
  }

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const futureDateOb = new Date(ts);
  futureDateOb.setSeconds(futureDateOb.getSeconds() + 1);
  const formattedDate = `${padZero(futureDateOb.getHours())}:${padZero(
    futureDateOb.getMinutes()
  )}:${padZero(futureDateOb.getSeconds())}.${padZero(
    futureDateOb.getMilliseconds(),
    3
  )}`;
  const formattedDatePurchase = `${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}.${padZero(date_ob.getMilliseconds(), 3)}`;

  const isoDate = `${req.body.paymentDate}T${formattedDate}Z`;
  req.body.paymentDate = isoDate;
  const isopurchasDate = `${req.body.date}T${formattedDatePurchase}Z`;
  req.body.date = isopurchasDate;
  const {
    paid,
    exchangeRate,
    totalInMainCurrency: totalPurchasePriceMainCurrency,
    invoiceNumber,
    invoiceSubTotal,
    invoiceDiscount,
    invoiceGrandTotal,
    ManualInvoiceDiscount,
    ManualInvoiceDiscountValue,
    invoiceName,
    paymentInFundCurrency,
    InvoiceDiscountType,
    subtotalWithDiscount,
    paymentDate,
    invoiceTax,
  } = req.body;
  let invoicesItem, supllierObject, taxDetails, financailFund, tag, currency;

  supllierObject = JSON.parse(req.body.supllierObject);

  taxDetails = JSON.parse(req.body.taxDetails);
  invoicesItem = JSON.parse(req.body.invoicesItems);
  currency = JSON.parse(req.body.currency);
  tag = JSON.parse(req.body.tag);

  let payment;
  const originalItems = purchase.invoicesItems;
  const updatedItems = JSON.parse(req.body.invoicesItems);
  const bulkProductUpdatesOriginal = [];
  const bulkProductUpdatesNew = [];

  // Reverting the quantities of original items
  originalItems
    .filter(
      (item) => item.type !== "unTracedproduct" && item.type !== "expense"
    )
    .forEach((item) => {
      bulkProductUpdatesOriginal.push({
        updateOne: {
          filter: { qr: item.qr, "stocks.stockId": item.stock._id },
          update: {
            $inc: {
              quantity: -item.quantity,
              "stocks.$.productQuantity": -item.quantity,
            },
          },
        },
      });
    });

  // Applying the quantities of updated items
  updatedItems
    .filter(
      (item) => item.type !== "unTracedproduct" && item.type !== "expense"
    )
    .forEach((item) => {
      const filterForUpdate = {
        qr: item.qr,
        "stocks.stockId": item.stock._id,
      };

      const updateIfExists = {
        $inc: {
          quantity: +item.quantity,
          "stocks.$.productQuantity": +item.quantity,
        },
        $set: {
          buyingprice: item.orginalBuyingPrice,
        },
      };

      const filterForInsert = {
        qr: item.qr,
        "stocks.stockId": { $ne: item.stock._id },
        companyId,
      };

      const updateIfMissing = {
        $inc: {
          quantity: +item.quantity,
        },
        $set: {
          buyingprice: item.orginalBuyingPrice,
        },
        $push: {
          stocks: {
            stockId: item.stock._id,
            stockName: item.stock.stock,
            productQuantity: item.quantity,
          },
        },
      };

      bulkProductUpdatesNew.push(
        { updateOne: { filter: filterForUpdate, update: updateIfExists } },
        { updateOne: { filter: filterForInsert, update: updateIfMissing } }
      );
    });

  try {
    await productModel.bulkWrite(bulkProductUpdatesOriginal);
    await productModel.bulkWrite(bulkProductUpdatesNew);
  } catch (error) {
    console.error("Error during bulk updates:", error);
    return next(new ApiError("Bulk update failed" + error, 500));
  }

  const purchaseSupplier = await suppliersModel.findOne({
    _id: purchase.supllier.id,
    companyId,
  });
  const supplier = await suppliersModel.findOne({
    _id: supllierObject.id,
    companyId,
  });
  let newPurchaseInvoice;
  req.body.file = req.file?.filename;

  if (paid === "paid") {
    financailFund = JSON.parse(req.body.financailFund);

    if (req.body.totalRemainderMainCurrency > 0.3) {
      req.body.paid = "unpaid";
    }
    req.body.paidstatus = "paid";

    const financialFund = await financialFundsModel.findOne({
      _id: financailFund.id,
      companyId,
    });
    financialFund.fundBalance -= paymentInFundCurrency;

    newPurchaseInvoice = await PurchaseInvoicesModel.findOneAndUpdate(
      { _id: id, companyId },
      {
        employee: req.user._id,
        invoicesItems: invoicesItem,
        date: req.body.date || formattedDate,
        supllier: supllierObject,
        currency,
        exchangeRate,
        financailFund,
        invoiceNumber,
        paid: req.body.paid,
        totalPurchasePriceMainCurrency,
        invoiceSubTotal,
        invoiceDiscount,
        invoiceGrandTotal,
        taxDetails,
        invoiceName,
        paymentInFundCurrency: paymentInFundCurrency,
        ManualInvoiceDiscount,
        ManualInvoiceDiscountValue,
        InvoiceDiscountType,
        subtotalWithDiscount,
        paymentDate,
        invoiceTax,
        tag,
        totalRemainder: req.body.totalRemainder,
        totalRemainderMainCurrency: req.body.totalRemainderMainCurrency,
        description: req.body.description,
        file: req.body.file,
        companyId,
      },
      { new: true }
    );
    payment = await PaymentModel.create({
      supplierId: supllierObject.id,
      supplierName: supllierObject.name,
      total: req.body.paymentInInvoiceCurrency,
      totalMainCurrency: req.body.paymentInMainCurrency,
      paymentInFundCurrency: paymentInFundCurrency,
      exchangeRate: financialFund.fundCurrency.exchangeRate,
      financialFundsCurrencyCode: financailFund.code,
      date: req.body.paymentDate || formattedDate,
      financialFundsName: financialFund.fundName,
      financialFundsId: financailFund.id,
      invoiceNumber: invoiceNumber,
      invoiceID: newPurchaseInvoice._id,
      counter: nextCounterPayment,
      description: req.body.paymentDescription,
      invoiceCurrencyCode: req.body.currency.currencyCode,
      paymentText: "Withdrawal",
      type: "purchase",
      companyId,
      payid: {
        id: newPurchaseInvoice._id,
        status: req.body.paid,
        invoiceTotal: req.body.invoiceGrandTotal,
        invoiceName: req.body.invoiceName,
        invoiceCurrencyCode: req.body.currency.currencyCode,
        paymentInFundCurrency: paymentInFundCurrency,
        paymentMainCurrency: req.body.paymentInMainCurrency,
        paymentInInvoiceCurrency: req.body.paymentInInvoiceCurrency,
      },
    });
    const reports = await reportsFinancialFunds.create({
      date: req.body.paymentDate || formattedDate,
      ref: newPurchaseInvoice._id,
      amount: paymentInFundCurrency,
      type: "purchase",
      exchangeRate: exchangeRate,
      exchangeAmount: totalPurchasePriceMainCurrency,
      financialFundId: financailFund.id,
      financialFundRest: financialFund.fundBalance,
      paymentType: "Withdrawal",
      payment: payment._id,
      description: req.body.paymentDescription,
      companyId,
    });
    purchase.payments.push({
      payment: paymentInFundCurrency,
      paymentMainCurrency: req.body.paymentInMainCurrency,
      financialFunds: financialFund.fundName,
      date: req.body.paymentDate || formattedDate,
      financialFundsCurrencyCode: financailFund.code,
      paymentInInvoiceCurrency: req.body.paymentInInvoiceCurrency,
      paymentID: payment._id,
    });
    purchase.reportsBalanceId = reports.id;

    await purchase.save();

    await financialFund.save();
    if (supllierObject.id === purchase.supllier.id) {
      supplier.total +=
        totalPurchasePriceMainCurrency -
        purchase.totalPurchasePriceMainCurrency;
    } else {
      purchaseSupplier.total -= purchase.totalPurchasePriceMainCurrency;
      await purchaseSupplier.save();
      supplier.total += totalPurchasePriceMainCurrency;
    }
    supplier.TotalUnpaid =
      Number(supplier.TotalUnpaid) -
      Number(purchase.totalPurchasePriceMainCurrency) +
      Number(totalPurchasePriceMainCurrency) -
      Number(req.body.paymentInMainCurrency);
    await supplier.save();
    await createPaymentHistory(
      "payment",
      req.body.paymentDate || formattedDate,
      req.body.paymentInMainCurrency,
      req.body.paymentInFundCurrency,
      "supplier",
      supllierObject.id,
      id,
      companyId,
      req.body.paymentDescription,
      payment._id,
      "Deposit",
      "purchase",
      financailFund.code
    );
  } else {
    if (
      req.body.totalRemainderMainCurrency ===
      purchase.totalPurchasePriceMainCurrency
    ) {
      if (supllierObject.id === purchase.supllier.id) {
        supplier.TotalUnpaid +=
          totalPurchasePriceMainCurrency -
          purchase.totalPurchasePriceMainCurrency;
        supplier.total +=
          totalPurchasePriceMainCurrency -
          purchase.totalPurchasePriceMainCurrency;
      } else {
        purchaseSupplier.total -= purchase.totalPurchasePriceMainCurrency;
        purchaseSupplier.TotalUnpaid -= purchase.totalPurchasePriceMainCurrency;

        supplier.total += totalPurchasePriceMainCurrency;
        supplier.TotalUnpaid += totalPurchasePriceMainCurrency;
      }
      await purchaseSupplier.save();
      await supplier.save();
    }
    const newInvoiceData = {
      employee: req.user._id,
      date: req.body.date || formattedDate,
      invoicesItems: invoicesItem,
      supllier: supllierObject,
      currency,
      exchangeRate,
      financailFund,
      invoiceNumber,
      paid: "unpaid",
      totalPurchasePriceMainCurrency,
      invoiceSubTotal,
      invoiceDiscount,
      totalRemainderMainCurrency: totalPurchasePriceMainCurrency,
      totalRemainder: invoiceGrandTotal,
      invoiceGrandTotal,
      taxDetails,
      invoiceName,
      ManualInvoiceDiscount,
      ManualInvoiceDiscountValue,
      InvoiceDiscountType,
      subtotalWithDiscount,
      paymentDate,
      invoiceTax,
      tag,
      totalRemainder: req.body.totalRemainder,
      totalRemainderMainCurrency: req.body.totalRemainderMainCurrency,
      file: req.body.file,
      companyId,
    };
    newPurchaseInvoice = await PurchaseInvoicesModel.updateOne(
      { _id: id, companyId },
      newInvoiceData
    );
  }

  const productQRCodes = invoicesItem.map((item) => item.qr);
  const products = await productModel.find({
    qr: { $in: productQRCodes },
    companyId,
  });
  const productMap = new Map(products.map((prod) => [prod.qr, prod]));
  const movementMap = new Map();

  invoicesItem.forEach((item) => {
    if (item.type === "unTracedproduct" || item.type === "expense") return;

    const existing = movementMap.get(item.qr);
    const originalItem = originalItems.find((o) => o.qr === item.qr);
    const originalQty = originalItem?.quantity ?? 0;

    if (!existing) {
      movementMap.set(item.qr, {
        ...item,
        quantity: item.quantity - originalQty,
      });
    } else {
      existing.quantity += item.quantity - originalQty;
      existing.orginalBuyingPrice = item.orginalBuyingPrice;
    }
  });

  await Promise.all(
    Array.from(movementMap.entries()).map(async ([qr, item]) => {
      const product = productMap.get(qr);
      if (!product) return;

      const totalStockQuantity = product.stocks.reduce(
        (total, stock) => total + stock.productQuantity,
        0
      );

      await createProductMovement(
        product._id,
        newPurchaseInvoice._id,
        totalStockQuantity,
        item.quantity,
        0,
        0,
        "movement",
        "in",
        "purchase",
        companyId
      );

      if (
        item.orginalBuyingPrice !== undefined &&
        item.orginalBuyingPrice !== product.buyingprice
      ) {
        await createProductMovement(
          product._id,
          newPurchaseInvoice._id,
          0,
          0,
          item.orginalBuyingPrice,
          product.buyingprice,
          "price",
          "in",
          "purchase",
          companyId
        );
      }
    })
  );

  const bulkSupplierPromises = invoicesItem.map(async (item, index) => {
    const product = productMap.get(item.qr);
    const updates = [];

    if (product) {
      if (!product.suppliers.includes(supllierObject.id)) {
        product.suppliers.push(supllierObject.id);
        updates.push(product.save());
      }
    } else if (item.type === "unTracedproduct") {
      await unTracedproductLogModel.create({
        name: item.name,
        buyingPrice: item.convertedBuyingPrice || item.orginalBuyingPrice,
        type: "purchase",
        quantity: item.quantity,
        tax: item.tax,
        totalWithoutTax: item.totalWithoutTax,
        total: item.total,
        companyId,
      });
    } else if (item.type === "expense") {
      console.log("Hi");
    }

    return Promise.all(updates);
  });

  await Promise.all(bulkSupplierPromises);

  const history = await createInvoiceHistory(
    companyId,
    id,
    "edit",
    req.user._id,
    new Date().toISOString()
  );
  if (
    req.body.totalRemainderMainCurrency ===
    purchase.totalPurchasePriceMainCurrency
  ) {
    await PaymentHistoryModel.deleteMany({
      ref: id,
      companyId,
    });
    await createPaymentHistory(
      "invoice",
      req.body.date || formattedDate,
      totalPurchasePriceMainCurrency,
      invoiceGrandTotal,
      "supplier",
      supllierObject.id,
      id,
      companyId,
      req.body.description,
      "",
      "",
      "",
      currency.currencyCode
    );
  }
  res.status(200).json({
    status: "success",
    message: "Purchase invoice updated successfully",
    data: newPurchaseInvoice,
  });
});

exports.refundPurchaseInvoice = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  req.body.companyId = companyId;
  const nextCounterPayment =
    (await PaymentModel.countDocuments({ companyId })) + 1;
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const formattedDate = new Date().toISOString().replace("T", " ").slice(0, 19);
  const ts = Date.now();
  const time = () => {
    const padZero = (num) => String(num).padStart(2, "0");
    const dateOb = new Date(ts);
    const hours = padZero(dateOb.getHours());
    const minutes = padZero(dateOb.getMinutes());
    const seconds = padZero(dateOb.getSeconds());
    return `${hours}:${minutes}:${seconds}`;
  };
  const futureTs = ts + 5000;

  const futureDateOb = new Date(futureTs);
  const futureDateOb2 = new Date(ts);

  futureDateOb2.setSeconds(futureDateOb.getSeconds() + 1);

  const futureFormattedDate = `${padZero(futureDateOb2.getHours())}:${padZero(
    futureDateOb2.getMinutes()
  )}:${padZero(futureDateOb2.getSeconds())}.${padZero(
    futureDateOb2.getMilliseconds(),
    3
  )}`;
  req.body.paymentDate = `${req.body.paymentDate}T${futureFormattedDate}Z`;

  const futureFormatDate = `${padZero(futureDateOb.getHours())}:${padZero(
    futureDateOb.getMinutes()
  )}:${padZero(futureDateOb.getSeconds())}.${padZero(
    futureDateOb.getMilliseconds(),
    3
  )}`;
  req.body.date = `${req.body.date}T${futureFormatDate}Z`;

  const formatteTime = time();
  const {
    supplier: suppliers,
    paid,
    financailFund,
    exchangeRate,
    totalInMainCurrency: totalPurchasePriceMainCurrency,
    currency,
    invoiceNumber,
    invoiceSubTotal,
    invoiceDiscount,
    invoiceGrandTotal,
    ManualInvoiceDiscount,
    taxDetails,
    invoiceName,
    paymentInFundCurrency,
    InvoiceDiscountType,
    subtotalWithDiscount,
    paymentDate,
  } = req.body;

  let supplier, invoicesItem, newPurchaseInvoice;

  try {
    invoicesItem = JSON.parse(req.body.invoicesItems);
    supplier = await suppliersModel.findOne({ _id: suppliers.id, companyId });
    if (!supplier) throw new Error("Supplier not found");
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }

  const productQRCodes = invoicesItem.map((item) => item.qr);
  const products = await productModel.find({
    qr: { $in: productQRCodes },
    companyId,
  });

  // Create a map for quick product lookups by QR code
  const productMap = new Map(products.map((prod) => [prod.qr, prod]));
  let payment;
  // Handle invoice creation based on 'paid' status
  if (paid === "paid") {
    // Handle paid invoice logic
    req.body.status = "paid";
    if (req.body.totalRemainderMainCurrency > 0.3) {
      req.body.paid = "unpaid";
    }
    const financialFund = await financialFundsModel.findOne({
      _id: financailFund.id,
      companyId,
    });

    if (!financialFund) throw new Error("Financial fund not found");

    financialFund.fundBalance += paymentInFundCurrency;

    newPurchaseInvoice = await refundPurchaseInviceModel.create({
      invoicesItems: invoicesItem,
      date: req.body.date || formattedDate,
      supplier: suppliers,
      currency,
      exchangeRate,
      financailFund,
      invoiceNumber,
      paid,
      totalPurchasePriceMainCurrency,
      invoiceSubTotal,
      invoiceDiscount,
      invoiceGrandTotal,
      taxDetails,
      invoiceName,
      paymentInFundCurrency: paymentInFundCurrency,
      ManualInvoiceDiscount,
      InvoiceDiscountType,
      subtotalWithDiscount,
      paymentDate,
      journalCounter: req.body.journalCounter,
      invoiceTax: req.body.invoiceTax,
      type: "refund purchase",
      tag: req.body.tag,
      totalRemainderMainCurrency: req.body.totalRemainderMainCurrency,
      totalRemainder: req.body.totalRemainder,
      companyId,
    });
    // Use Promise.all for parallel database operations

    payment = await PaymentModel.create({
      supplierId: supplier.id,
      supplierName: supplier.name,
      total: req.body.paymentInInvoiceCurrency,
      totalMainCurrency: req.body.paymentInMainCurrency,
      paymentInFundCurrency: paymentInFundCurrency,
      exchangeRate: financialFund.fundCurrency.exchangeRate,
      financialFundsCurrencyCode: financailFund.code,
      date: req.body.paymentDate || formattedDate,
      financialFundsName: financialFund.fundName,
      financialFundsId: financailFund.id,
      invoiceNumber: invoiceNumber,
      invoiceID: newPurchaseInvoice._id,
      counter: nextCounterPayment,
      description: req.body.paymentDescription,
      invoiceCurrencyCode: req.body.currency.currencyCode,
      paymentText: "Deposit",
      companyId,
      payid: {
        id: newPurchaseInvoice._id,
        status: req.body.paid,
        invoiceTotal: req.body.invoiceGrandTotal,
        invoiceName: req.body.invoiceName,
        invoiceCurrencyCode: req.body.currency.currencyCode,
        paymentInFundCurrency: paymentInFundCurrency,
        paymentMainCurrency: req.body.paymentInMainCurrency,
        paymentInInvoiceCurrency: req.body.paymentInInvoiceCurrency,
      },
    });

    const reports = await reportsFinancialFunds.create({
      date: req.body.paymentDate || formattedDate,
      ref: newPurchaseInvoice._id,
      amount: paymentInFundCurrency,
      type: "refund-purchase",
      exchangeRate,
      financialFundId: financailFund.id,
      financialFundRest: financialFund.fundBalance,
      paymentType: "Deposit",
      payment: payment._id,
      companyId,
    });
    newPurchaseInvoice.payments.push({
      payment: paymentInFundCurrency,
      paymentMainCurrency: req.body.paymentInMainCurrency,
      financialFunds: financialFund.fundName,
      financialFundsCurrencyCode: req.body.financailFund.code,
      date: req.body.paymentDate || formattedDate,
      paymentID: payment._id,
      paymentInInvoiceCurrency: req.body.paymentInInvoiceCurrency,
      financialFundsId: financailFund.id,
    });

    // Assign reports balance ID after the report is created
    newPurchaseInvoice.reportsBalanceId = reports.id;
    await newPurchaseInvoice.save();

    // Update supplier and financial fund balances
    supplier.total -=
      totalPurchasePriceMainCurrency - ManualInvoiceDiscount || 0;
    supplier.TotalUnpaid -=
      totalPurchasePriceMainCurrency - ManualInvoiceDiscount || 0;
    await financialFund.save();
  } else {
    // Handle unpaid invoice logic
    let total = totalPurchasePriceMainCurrency - ManualInvoiceDiscount;

    supplier.TotalUnpaid -= total || 0;

    supplier.total -= total || 0;

    newPurchaseInvoice = await refundPurchaseInviceModel.create({
      employee: req.user._id,
      date: req.body.date || formattedDate,
      invoicesItems: invoicesItem,
      supplier: suppliers,
      currency,
      exchangeRate,
      financailFund,
      invoiceNumber,
      paid: "unpaid",
      totalPurchasePriceMainCurrency,
      invoiceSubTotal,
      invoiceDiscount,
      totalRemainderMainCurrency: totalPurchasePriceMainCurrency,
      totalRemainder: invoiceGrandTotal,
      invoiceGrandTotal,
      taxDetails,
      invoiceName,
      ManualInvoiceDiscount,
      InvoiceDiscountType,
      subtotalWithDiscount,
      paymentDate,
      journalCounter: req.body.journalCounter,
      invoiceTax: req.body.invoiceTax,
      type: "refund purchase",
      tag: req.body.tag,
      companyId,
    });
  }

  // Bulk update product quantities and stock information
  const bulkProductUpdates = invoicesItem
    .filter(
      (item) => item.type !== "unTracedproduct" && item.type !== "expense"
    )
    .map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id, companyId },
        update: {
          $inc: {
            "stocks.$.productQuantity": -item.quantity,
          },
          $set: { buyingprice: item.orginalBuyingPrice },
        },
      },
    }));

  await productModel.bulkWrite(bulkProductUpdates);

  const movementMap = new Map();
  for (const item of invoicesItem) {
    if (item.type === "unTracedproduct" || item.type === "expense") continue;

    const existing = movementMap.get(item.qr);
    if (!existing) {
      movementMap.set(item.qr, { ...item });
    } else {
      existing.quantity += item.quantity;
      existing.orginalBuyingPrice = item.orginalBuyingPrice;
    }
  }
  await Promise.all(
    Array.from(movementMap.entries()).map(async ([qr, item]) => {
      const product = productMap.get(qr);
      if (!product) return;

      const totalStockQuantity = product.stocks.reduce(
        (total, stock) => total + stock.productQuantity,
        0
      );

      await createProductMovement(
        product._id,
        newPurchaseInvoice._id,
        totalStockQuantity - item.quantity,
        item.quantity,
        0,
        0,
        "movement",
        "out",
        "refund purchase",
        companyId
      );

      if (item.orginalBuyingPrice !== product.buyingprice) {
        await createProductMovement(
          product._id, //productId
          newPurchaseInvoice._id, //reference
          0, //newQuantity
          0, //quantity
          item.orginalBuyingPrice, //newPrice
          product.buyingprice, //oldPrice
          "price", //type
          "in", //movementType
          "refund purchase", //source
          companyId //dbName
        );
      }
    })
  );

  const bulkSupplierPromises = invoicesItem.map(async (item) => {
    const product = productMap.get(item.qr);
    const updates = [];

    if (product) {
      if (!product.suppliers.includes(suppliers.id)) {
        product.suppliers.push(suppliers.id);
        updates.push(product.save());
      }
    } else if (item.type === "unTracedproduct") {
      await unTracedproductLogModel.create({
        name: item.name,
        buyingPrice: item.convertedBuyingPrice || item.orginalBuyingPrice,
        type: "purchase",
        quantity: item.quantity,
        tax: item.tax,
        totalWithoutTax: item.totalWithoutTax,
        total: item.total,
        companyId,
      });
    } else if (item.type === "expense") {
      console.log("Hi");
    }

    return Promise.all(updates);
  });

  // Ensure all mapped promises are awaited
  await Promise.all(bulkSupplierPromises);

  await supplier.save();
  await createPaymentHistory(
    "Refund Invoice",
    req.body.date || formattedDate,
    totalPurchasePriceMainCurrency,
    invoiceGrandTotal,
    "supplier",
    suppliers.id,
    newPurchaseInvoice._id,
    companyId,
    "",
    "",
    "Deposit",
    "refund Purchase",
    currency.currencyCode
  );
  if (paid === "paid") {
    await createPaymentHistory(
      "payment",
      req.body.paymentDate || formattedDate,
      totalPurchasePriceMainCurrency,
      invoiceGrandTotal,
      "supplier",
      "",
      newPurchaseInvoice._id,
      companyId,
      "",
      payment._id,
      "Deposit",
      "refund Purchase",
      financailFund.code
    );
  }
  createInvoiceHistory(
    companyId,
    newPurchaseInvoice._id,
    "create",
    req.user._id,
    req.body.date
  );
  res.status(201).json({
    status: "success",
    message: "Invoice created successfully",
    data: newPurchaseInvoice,
  });
});

exports.getReturnPurchase = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = req.query.limit || 0;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const filters = req.query?.filters ? JSON.parse(req.query?.filters) : {};
  let query = { companyId };

  if (req.query.keyword) {
    query.$or = [
      {
        "supllier.name": { $regex: req.query.keyword, $options: "i" },
      },
      {
        invoiceName: { $regex: req.query.keyword, $options: "i" },
      },
      {
        invoiceNumber: { $regex: req.query.keyword, $options: "i" },
      },
    ];
  }

  const totalItems = await refundPurchaseInviceModel.countDocuments(query);

  if (filters?.startDate || filters?.endDate) {
    query.date = {};
    if (filters?.startDate) {
      query.date.$gte = filters.startDate;
    }
    if (filters?.endDate) {
      query.date.$lte = filters.endDate;
    }
  }
  if (filters?.tags?.length) {
    const tagIds = filters.tags.map((tag) => tag.id);
    query["tag.id"] = { $in: tagIds };
  }
  if (filters.paymentStatus) {
    query.paid = filters.paymentStatus;
  }
  if (filters.employee) {
    query.employee = filters.employee;
  }
  if (filters?.businessPartners) {
    query["supllier.name"] = {
      $regex: filters.businessPartners,
      $options: "i",
    };
  }
  if (filters?.filterTags?.length) {
    query["tag.name"] = { $in: filters.filterTags };
  }
  const totalPages = Math.ceil(totalItems / pageSize);
  const refund = await refundPurchaseInviceModel
    .find(query)
    .skip(skip)
    .limit(pageSize)
    .sort({ date: -1 })
    .populate({
      path: "employee",
      select: "name profileImg email phone",
    });
  res.status(200).json({
    status: "success",
    results: refund.length,
    Pages: totalPages,
    data: refund,
  });
});

exports.getOneReturnPurchase = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const pageSize = req.query.limit || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await invoiceHistoryModel.countDocuments({
    invoiceId: id,
    companyId,
  });

  const totalPages = Math.ceil(totalItems / pageSize);
  const invoiceHistory = await invoiceHistoryModel
    .find({
      invoiceId: id,
      companyId,
    })
    .populate({ path: "employeeId", select: "name email" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);
  const purchase = await refundPurchaseInviceModel.findOne({
    _id: id,
    companyId,
  });
  if (!purchase) {
    return next(new ApiError(`No purchase for this id ${id}`, 404));
  }
  res.status(200).json({
    status: "true",
    Pages: totalPages,
    data: purchase,
    history: invoiceHistory,
  });
});

exports.cancelPurchaseInvoice = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const { id } = req.params;
  // 1) find prucseInvices
  const purchaseInvoices = await PurchaseInvoicesModel.findOne({
    _id: id,
    companyId,
  });
  const supplier = await suppliersModel.findOne({
    _id: purchaseInvoices.supllier.id,
  });

  if (
    purchaseInvoices.payments.length <= 0 &&
    purchaseInvoices.type !== "purchase cancelled"
  ) {
    // 2) Take Out the Quantity
    const bulkProductUpdates = purchaseInvoices.invoicesItems.map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id, companyId },
        update: {
          $inc: {
            quantity: -item.quantity,
            "stocks.$.productQuantity": -item.quantity,
          },
        },
      },
    }));
    await productModel.bulkWrite(bulkProductUpdates);
    // 3) Take out in the Active Quantity
    // Step 1: Aggregate quantities by product QR
    const itemMap = new Map();

    for (const item of purchaseInvoices.invoicesItems) {
      if (itemMap.has(item.qr)) {
        const existing = itemMap.get(item.qr);
        existing.quantity += item.quantity;
      } else {
        itemMap.set(item.qr, {
          qr: item.qr,
          quantity: item.quantity,
          orginalBuyingPrice: item.orginalBuyingPrice,
        });
      }
    }

    // Step 2: Process each unique product once
    await Promise.all(
      Array.from(itemMap.values()).map(async (item) => {
        try {
          const product = await productModel.findOne({ qr: item.qr });
          if (!product || product.type === "Service") return;
          else if (item.type === "unTracedproduct") {
            await unTracedproductLogModel.create({
              name: item.name,
              buyingPrice: item.convertedBuyingPrice || item.orginalBuyingPrice,
              type: "purchase",
              quantity: item.quantity,
              tax: item.tax,
              totalWithoutTax: item.totalWithoutTax,
              total: item.total,
              companyId,
            });
          } else if (item.type === "expense") {
            console.log("Hi");
          }

          const totalStockQuantity = product.stocks.reduce(
            (total, stock) => total + stock.productQuantity,
            0
          );

          // Create one movement record per product
          await createProductMovement(
            product.id,
            id,
            totalStockQuantity,
            item.quantity,
            0,
            0,
            "movement",
            "out",
            "purchase cancelled",
            companyId
          );
        } catch (error) {
          console.error(`Error processing product ${item.qr}:`, error);
        }
      })
    );

    // Execute all promises at once

    supplier.total -= purchaseInvoices.totalRemainderMainCurrency || 0;
    supplier.TotalUnpaid -= purchaseInvoices.totalRemainderMainCurrency || 0;
    await supplier.save();

    // 4) minus balance form Fund and delete archives Reports in Supplier
    if (purchaseInvoices.reportsBalanceId) {
      await reportsFinancialFunds.findOneAndUpdate(
        {
          _id: purchaseInvoices.reportsBalanceId,
          companyId,
        },
        { archives: true, paymentType: "Deposit" },
        { new: true }
      );
    }
    await paymentHistoryModel.deleteMany({
      ref: id,
      companyId,
    });
    const history = createInvoiceHistory(
      companyId,
      id,
      "cancel",
      req.user._id,
      new Date().toISOString()
    );
    purchaseInvoices.type = "purchase cancelled";
    purchaseInvoices.invoiceNumber =
      purchaseInvoices.invoiceNumber + " cancelled";
    purchaseInvoices.invoiceName = purchaseInvoices.invoiceName + " cancelled";
    purchaseInvoices.totalRemainderMainCurrency = 0;
    purchaseInvoices.totalRemainder = 0;
    purchaseInvoices.paid = "paid";
    await purchaseInvoices.save();
    res.status(200).json({ message: "cancel is success" });
  } else {
    return next(
      new ApiError("Have a Payment pless delete the Payment or Canceled ", 500)
    );
  }
});

exports.findSupplier = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }
  const supplierid = req.params.id;

  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  const filter = {
    "supllier.id": supplierid,
    paid: "unpaid",
    type: "purchase",
    companyId,
  };

  const purchaseInvoices = await PurchaseInvoicesModel.find(filter)
    .skip(skip)
    .limit(pageSize);

  const totalItems = await PurchaseInvoicesModel.countDocuments(filter);

  const totalPages = Math.ceil(totalItems / pageSize);

  res.status(200).json({
    results: purchaseInvoices.length,
    Pages: totalPages,
    data: purchaseInvoices,
  });
});
