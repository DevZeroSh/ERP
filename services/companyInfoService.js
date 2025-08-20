const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const CompanyInfnoModel = require("../models/companyInfoModel");
const currencyModel = require("../models/currencyModel");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const roleDashboardModel = require("../models/roleDashboardModel");
const rolesModel = require("../models/roleModel");
const StockModel = require("../models/stockModel");
const thirdPartyAuthModel = require("../models/ecommerce/thirdPartyAuthModel");
const paymentMethodModel = require("../models/ecommerce/ecommercePaymentMethodModel");
const ecommerceSettingsModel = require("../models/ecommerce/ecommerceSettingsModel");
const { createEmployee } = require("./employeeServices");
const employeeModel = require("../models/employeeModel");
const generatePassword = require("../utils/tools/generatePassword");
const multerStorage = multer.memoryStorage();
const bcrypt = require("bcryptjs");

const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new ApiError("Only images allowed", 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadCompanyLogo = upload.single("companyLogo");

exports.resizerLogo = asyncHandler(async (req, res, next) => {
  const filename = `company-${uuidv4()}-${Date.now()}.png`;

  if (req.file) {
    await sharp(req.file.buffer)
      .toFormat("png")
      .png({ quality: 90 })
      .toFile(`uploads/companyinfo/${filename}`);
    req.body.companyLogo = filename;
  }

  next();
});

//@desc Create company info
//@route POST /api/companyinfo
exports.createCompanyInfo = asyncHandler(async (req, res, next) => {
  //1-craet a company
  const companyInfo = await CompanyInfnoModel.create(req.body);

  const dashboardRoles = await roleDashboardModel.find();
  const linkAccount = [
    {
      name: "Purcahse",
      previewNameAr: "مشتريات",
      previewNameEn: "Purchase",
      previewNameTr: "Satın alma",
      companyInfo: companyInfo,
    },
    {
      name: "Sales",
      previewNameAr: "مبيعات",
      previewNameEn: "Sales",
      previewNameTr: "Satışlar",
      companyInfo: companyInfo,
    },
    {
      name: "Supplier",
      previewNameAr: "موردون",
      previewNameEn: "Suppliers",
      previewNameTr: "Tedarikçiler",
      companyInfo: companyInfo,
    },
    {
      name: "Customers",
      previewNameEn: "Customers",
      previewNameAr: "عملاء",
      previewNameTr: "Müşteriler",
      companyInfo: companyInfo,
    },
    {
      name: "Stocks",
      previewNameAr: "المستودعات",
      previewNameEn: "Stocks",
      previewNameTr: "Depolar",
      companyInfo: companyInfo,
    },
    {
      name: "Purchase withdrawals",
      previewNameAr: "مسموحات المشتريات",
      previewNameEn: " purchase allowances ",
      previewNameTr: "Satın Alma İskontoları",
      companyInfo: companyInfo,
    },
    {
      name: "Sales withdrawals",
      previewNameAr: "مسموحات المبيعات",
      previewNameEn: " Sales allowances ",
      previewNameTr: "Satış İskontoları",
      companyInfo: companyInfo,
    },
    {
      name: "Sales returns",
      previewNameAr: "إعادة المبيعات",
      previewNameEn: "Refund sales",
      previewNameTr: "Satış iadeleri",
      companyInfo: companyInfo,
    },
    {
      name: "Purchase returns",
      previewNameAr: "إعادة المشتريات",
      previewNameEn: "Purchase returns",
      previewNameTr: "Satın alma iadeleri",
      companyInfo: companyInfo,
    },
    {
      name: "cost of sold services",
      previewNameAr: "كلفة الخدمات المباعة",
      previewNameEn: "Cost of sold services",
      previewNameTr: "Satılan servislerin maliyeti",
      companyInfo: companyInfo,
    },
    {
      name: "Cash",
      previewNameAr: "النقد",
      previewNameEn: "Cash",
      previewNameTr: "Nakit",
      companyInfo: companyInfo,
    },
    {
      name: "Earned discount",
      previewNameAr: "الخصومات المكتسبة",
      previewNameEn: "Earned discount",
      previewNameTr: "Kazanılan indirimler",
      companyInfo: companyInfo,
    },
    {
      name: "Discount granted",
      previewNameAr: "الخصومات الممنوحة",
      previewNameEn: "Discount granted",
      previewNameTr: "Verilen indirimler",
      companyInfo: companyInfo,
    },
    {
      name: "Salary",
      previewNameAr: "الرواتب",
      previewNameEn: "Salary",
      previewNameTr: "Maaşlar",
      companyInfo: companyInfo,
    },
    {
      name: "Should Pay Salary",
      previewNameAr: "الرواتب المتوجب دفعها",
      previewNameEn: "Should pay salary",
      previewNameTr: "Ödemesi gereken maaşlar",
      companyInfo: companyInfo,
    },
    {
      name: "cost of sold products",
      previewNameAr: "كلفة المنتجات المباعة",
      previewNameEn: "Cost of sold products",
      previewNameTr: "Satılan ürünlerin maliyeti",
      companyInfo: companyInfo,
    },
    {
      name: "Refund Sales",
      previewNameAr: "إعادة المبيعات",
      previewNameEn: "Refund sales",
      previewNameTr: "Satşlar iadesi",
      companyInfo: companyInfo,
    },
    {
      name: "Walk-In Customer",
      previewNameAr: "زبون نقدي",
      previewNameEn: "Walk-In customer",
      previewNameTr: "Nakdi müşteri",
      companyInfo: companyInfo,
    },
    {
      name: "Inventory Adjustment",
      previewNameAr: "ضبط المخزون",
      previewNameEn: "Inventory adjustment",
      previewNameTr: "Stok düzenlemesi",
      companyInfo: companyInfo,
    },
    {
      name: "Sales Service",
      previewNameAr: "خدمات المبيع",
      previewNameEn: "Sales services",
      previewNameTr: "Satış servisleri",
      companyInfo: companyInfo,
    },
    {
      name: "Capital",
      previewNameAr: "الرأسمال",
      previewNameEn: "Capital",
      previewNameTr: "Sermaye",
      companyInfo: companyInfo,
    },
  ];
  await linkAccount.create(linkAccount);
  await StockModel.create({ name: "main Stcok", companyId: companyInfo._id });

  //4-insert the main role
  // Extract IDs from the inserted documents
  const dashboardRoleIds = dashboardRoles.map((role) => role._id);
  const insertMainRole = await rolesModel.create({
    name: "Super Admin",
    description: "Role Description",
    rolesDashboard: dashboardRoleIds,
    superAdmin: true,
    companyId: companyInfo._id,
  });
  req.body.name = req.body.companyName;
  req.body.company = {
    companyId: companyInfo._id,
    selectedRoles: insertMainRole._id,
    companyName: req.body.companyName,
  };
  const oldEmail = await employeeModel.findOne({ email: req.body.email });
  if (!oldEmail) {
    const employeePass = generatePassword();
    const hashedPassword = await bcrypt.hash(employeePass, 12);
    req.body.password = hashedPassword;
    const employee = await employeeModel.create(req.body);
  } else {
    await employeeModel.findOneAndUpdate(
      { email: req.body.email },
      {
        $push: {
          company: {
            companyId: companyInfo._id,
            selectedRoles: insertMainRole._id,
            companyName: req.body.companyName,
          },
        },
      }
    );
  }

  //5-insert the main currency
  await currencyModel.create({
    currencyCode: req.body.currencyCode,
    currencyName: req.body.currencyName,
    exchangeRate: "1",
    is_primary: "true",
    companyId: companyInfo._id,
  });

  //6- Insert the 3rd party auth
  await thirdPartyAuthModel.create({
    googleAuthClientID: "",
    googleAuthClientSecret: "",
    facebookAuthAppID: "",
    redirectUri: "",
    companyId: companyInfo._id,
  });

  //7- Insert the e-commerce payment methods
  const paymentMethods = [
    {
      name: "onlinePayment",
      description: "",
      extraCharge: 1,
      minAmount: 1,
      maxAmount: 99999,
      status: false,
      companyId: companyInfo._id,
    },
    {
      name: "bankTransfer",
      description: "",
      extraCharge: 1,
      minAmount: 1,
      maxAmount: 99999,
      status: false,
      companyId: companyInfo._id,
    },
    {
      name: "payAtDoor",
      description: "",
      extraCharge: 1,
      minAmount: 1,
      maxAmount: 99999,
      status: false,
      companyId: companyInfo._id,
    },
  ];
  await paymentMethodModel
    .insertMany(paymentMethods, { ordered: false })
    .catch((err) => {
      console.log("the paymet is alread inserted", err.message);
    });
  //8- Insert default settings
  const defaultSettings = {
    page: [
      {
        name: "PDPL",
        title: "Personal Data Protection Law",
        key: "PDPL",
        description: "PDPL",
        content: "",
        companyId: companyInfo._id,
      },
      {
        name: "Privacy Policy",
        title: "Privacy Policy",
        key: "PrivPol",
        description: "Privacy Policy",
        content: "",
        companyId: companyInfo._id,
      },
      {
        name: "Terms & Conditions",
        title: "Terms & Conditions",
        key: "TermsConds",
        description: "Terms & Conditions",
        content: "",
        companyId: companyInfo._id,
      },
    ],
    slider: [
      {
        name: "Main",
        images: ["", "", ""],
        companyId: companyInfo._id,
      },
      {
        name: "Offers",
        images: ["", "", ""],
        companyId: companyInfo._id,
      },
    ],
    contactUs: {
      email: "",
      phone: "",
      facebookUrl: "",
      instagramUrl: "",
      linkedinUrl: "",
      xtwitterUrl: "",
      companyId: companyInfo._id,
    },
  };
  await ecommerceSettingsModel.updateOne({}, defaultSettings, {
    upsert: true,
  });
  //Finally, make res
  res.status(201).json({
    status: "true",
    message: "Company info inserted",
    data: {
      company: companyInfo,
      mainRoleId: insertMainRole._id,
    },
  });
});

//Get company info
//@role: who has role can Get company info
exports.getCompanyInfo = asyncHandler(async (req, res, next) => {
  const companyId = req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const companyInfos = await CompanyInfnoModel.findOne({ _id: companyId });
  const currency = await currencyModel.findOne({ is_primary: true, companyId });

  res.status(200).json({ status: "true", data: companyInfos, currency });
});

exports.updataCompanyInfo = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyInfo = await CompanyInfnoModel.findByIdAndUpdate(
      { _id: id },
      {
        companyName: req.body.companyName,
        companyAddress: req.body.companyAddress,
        companyTax: req.body.companyTax,
        companyTel: req.body.companyTel,
        companyLogo: req.body.companyLogo,
        turkcellApiKey: req.body.turkcellApiKey,
        pinCode: req.body.pinCode,
        color: req.body.color,
        havePin: req.body.havePin,
        facebookUrl: req.body.facebookUrl,
        instagramUrl: req.body.instagramUrl,
        xtwitterUrl: req.body.xtwitterUrl,
        linkedinUrl: req.body.linkedinUrl,
        emails: req.body.emails,
        prefix: req.body.prefix,
      },
      {
        new: true,
      }
    );
    if (!companyInfo) {
      return next(new ApiError(`There is no company with this id ${id}`, 404));
    } else {
      res.status(200).json({
        status: "true",
        message: "Company info updated",
        data: companyInfo,
      });
    }
  } catch (error) {
    console.log(error);
  }
});
