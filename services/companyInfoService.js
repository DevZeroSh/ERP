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

  //2-insert all main dashboard roles
  // const allDashRoles = [
  //   // Dashboard Start
  //   {
  //     title: "Dashboard",
  //     desc: "Dashboard",
  //     type: "General",
  //     info: "Access to the dashboard and ability to edit your personal profile",
  //   },
  //   {
  //     title: "Dashboard Reports",
  //     desc: "Dashboard",
  //     type: "General",
  //     info: "Full permissions for all dashboard features and reports",
  //   },

  //   // Sales Invoices Start
  //   {
  //     title: "Show Sales Invoices",
  //     desc: "Sales Invoices",
  //     type: "Accounting",
  //     info: "View sales invoices",
  //   },
  //   {
  //     title: "Sales Invoices",
  //     desc: "Sales Invoices",
  //     type: "Accounting",
  //     info: "Create and modify sales invoices",
  //   },
  //   {
  //     title: "Cancel Sales Invoices",
  //     desc: "Sales Invoices",
  //     type: "Accounting",
  //     info: "Cancel existing sales invoices",
  //   },

  //   // Quotation Start
  //   {
  //     title: "Show Quotation",
  //     desc: "Quotation",
  //     type: "Accounting",
  //     info: "View quotations",
  //   },
  //   {
  //     title: "Quotation",
  //     desc: "Quotation",
  //     type: "Accounting",
  //     info: "Create and edit quotations",
  //   },
  //   {
  //     title: "Change Quotation Status",
  //     desc: "Quotation",
  //     type: "Accounting",
  //     info: "Update quotation status",
  //   },
  //   {
  //     title: "Convert Quotation to Sales Invoices",
  //     desc: "Quotation",
  //     type: "Accounting",
  //     info: "Transform quotations into sales invoices",
  //   },

  //   // Customer Start
  //   {
  //     title: "Show Customer",
  //     desc: "Customer",
  //     type: "Accounting",
  //     info: "View customer information",
  //   },
  //   {
  //     title: "Customer",
  //     desc: "Customer",
  //     type: "Accounting",
  //     info: "Add new customers and edit existing ones",
  //   },
  //   {
  //     title: "Delete Customer",
  //     desc: "Customer",
  //     type: "Accounting",
  //     info: "Remove customers from the system",
  //   },
  //   {
  //     title: "Make Payment",
  //     desc: "Customer",
  //     type: "Accounting",
  //     info: "Process customer payments",
  //   },
  //   {
  //     title: "Show Payment",
  //     desc: "Customer",
  //     type: "Accounting",
  //     info: "View customer payment history",
  //   },

  //   // Refund Sales Invoices Start
  //   {
  //     title: "Show Refund Sales Invoices",
  //     desc: "Sales Invoices",
  //     type: "Accounting",
  //     info: "View refunded sales invoices",
  //   },
  //   {
  //     title: "Refund Sales Invoices",
  //     desc: "Sales Invoices",
  //     type: "Accounting",

  //     info: "Process sales invoice refunds",
  //   },

  //   // Purchase Invoices Start
  //   {
  //     title: "Show Purchase Invoices",
  //     desc: "Purchase Invoices",
  //     type: "Accounting",

  //     info: "View purchase invoices",
  //   },
  //   {
  //     title: "Purchase Invoices",
  //     desc: "Purchase Invoices",
  //     type: "Accounting",

  //     info: "Create and edit purchase invoices",
  //   },
  //   {
  //     title: "Cancel Purchase Invoices",
  //     desc: "Purchase Invoices",
  //     type: "Accounting",

  //     info: "Cancel purchase invoices",
  //   },

  //   // Purchase Order Start
  //   {
  //     title: "Show Purchase Order",
  //     desc: "Purchase Invoices",
  //     type: "Accounting",

  //     info: "View purchase orders",
  //   },
  //   {
  //     title: "Purchase Order",
  //     desc: "Purchase Invoices",
  //     type: "Accounting",

  //     info: "Create and edit purchase orders",
  //   },
  //   {
  //     title: "Change Status",
  //     desc: "Purchase Invoices",
  //     type: "Accounting",
  //     info: "Update purchase order status",
  //   },

  //   //Supplier Start
  //   {
  //     title: "Show Supplier",
  //     desc: "Supplier",
  //     type: "Accounting",
  //     info: "View supplier information",
  //   },
  //   {
  //     title: "Supplier",
  //     desc: "Supplier",
  //     type: "Accounting",
  //     info: "Add new suppliers and edit existing ones",
  //   },
  //   {
  //     title: "Delete Supplier",
  //     desc: "Supplier",
  //     type: "Accounting",
  //     info: "Remove suppliers from the system",
  //   },
  //   {
  //     title: "Make Payment",
  //     desc: "Supplier",
  //     type: "Accounting",
  //     info: "Process supplier payments",
  //   },

  //   // Refund Purchase Start
  //   {
  //     title: "Show Refund Purchase",
  //     desc: "Purchase Invoices",
  //     type: "Accounting",
  //     info: "View purchase refunds",
  //   },
  //   {
  //     title: "Refund Purchase",
  //     desc: "Purchase Invoices",
  //     type: "Accounting",
  //     info: "Process purchase refunds",
  //   },

  //   //Expense Start
  //   {
  //     title: "Show Expense",
  //     desc: "Expense",
  //     type: "Accounting",
  //     info: "View expense records",
  //   },
  //   {
  //     title: "Expense",
  //     desc: "Expense",
  //     type: "Accounting",
  //     info: "Add and edit expenses",
  //   },
  //   {
  //     title: "Cancel Expense",
  //     desc: "Expense",
  //     type: "Accounting",
  //     info: "Cancel expense entries",
  //   },

  //   //Expense Category Start
  //   {
  //     title: "Show Expense Category",
  //     desc: "Expense Category",
  //     type: "Accounting",
  //     info: "View expense categories",
  //   },
  //   {
  //     title: "Expense Category",
  //     desc: "Expense Category",
  //     type: "Accounting",
  //     info: "Create and edit expense categories",
  //   },
  //   {
  //     title: "Delete Expense Category",
  //     desc: "Expense",
  //     type: "Accounting",
  //     info: "Remove expense categories",
  //   },

  //   //Fund & Banks Start
  //   {
  //     title: "Show Fund",
  //     desc: "Fund & Banks",
  //     type: "Accounting",
  //     info: "View available funds",
  //   },
  //   {
  //     title: "Show Banks",
  //     desc: "Fund & Banks",
  //     type: "Accounting",

  //     info: "View bank accounts",
  //   },
  //   {
  //     title: "Fund & Banks",
  //     desc: "Fund & Banks",
  //     type: "Accounting",
  //     info: "Manage funds and bank accounts",
  //   },
  //   {
  //     title: "Transfer",
  //     desc: "Fund & Banks",
  //     type: "Accounting",
  //     info: "Transfer money between funds and banks",
  //   },
  //   {
  //     title: "Add or Take Money",
  //     desc: "Fund & Banks",
  //     type: "Accounting",
  //     info: "Deposit or withdraw money from funds/banks",
  //   },
  //   //Payments
  //   {
  //     title: "Show Payments",
  //     desc: "Payments",
  //     type: "Accounting",
  //     info: "That for view All and One Payments",
  //   },
  //   //Cash Flow Start
  //   {
  //     title: "Show Cash Flow",
  //     desc: "Cash Flow",
  //     type: "Accounting",
  //     info: "View cash flow reports",
  //   },

  //   //product Start
  //   {
  //     title: "Show Product & Archive Product",
  //     desc: "Product",
  //     type: "Stock",
  //     info: "View products including archived ones",
  //   },
  //   {
  //     title: "Product",
  //     desc: "Product",
  //     type: "Stock",
  //     info: "Add and edit products",
  //   },
  //   {
  //     title: "Archived the product",
  //     desc: "Product",
  //     type: "Stock",
  //     info: "Archive products while keeping records",
  //   },
  //   {
  //     title: "Export & Import Product",
  //     desc: "Product",
  //     type: "Stock",
  //     info: "Import and export product data",
  //   },
  //   {
  //     title: "Show Product Movments",
  //     desc: "Product",
  //     type: "Stock",
  //     info: "View product inventory movements",
  //   },

  //   //Category Start
  //   {
  //     title: "Show Category",
  //     desc: "Category",
  //     type: "General",
  //     info: "View product categories",
  //   },
  //   {
  //     title: "Category",
  //     desc: "Category",
  //     type: "General",
  //     info: "Create and edit product categories",
  //   },
  //   {
  //     title: "Delete Category",
  //     desc: "Category",
  //     type: "General",
  //     info: "Remove product categories",
  //   },

  //   // Stock reconciliation Start
  //   {
  //     title: "Show Stock Reconciliation",
  //     desc: "Stock Reconciliation",
  //     type: "Stock",
  //     info: "View inventory reconciliation reports",
  //   },
  //   {
  //     title: "Stock Reconciliation",
  //     desc: "Stock Reconciliation",
  //     type: "Stock",

  //     info: "Perform inventory reconciliation",
  //   },
  //   {
  //     title: "Approval of inventory",
  //     desc: "Stock Reconciliation",
  //     type: "Stock",
  //     info: "Approve inventory adjustments",
  //   },
  //   {
  //     title: "Show loss in inventory",
  //     desc: "Stock Reconciliation",
  //     type: "Stock",
  //     info: "View inventory loss reports",
  //   },

  //   //Show unknown products Start
  //   {
  //     title: "Show Unknown Products",
  //     desc: "Unknown Products",
  //     type: "Stock",
  //     info: "View unidentified products in inventory",
  //   },

  //   // Stock Start
  //   {
  //     title: "Show Stock",
  //     desc: "Stocks",
  //     type: "Stock",
  //     info: "View stock levels",
  //   },
  //   {
  //     title: "Stock",
  //     desc: "Stocks",
  //     type: "Stock",

  //     info: "Manage stock inventory",
  //   },
  //   {
  //     title: "Show Product in Stock",
  //     desc: "Stocks",
  //     type: "Stock",
  //     info: "View products available in stock",
  //   },
  //   {
  //     title: "Show Transfer Stock",
  //     desc: "Stocks",
  //     type: "Stock",

  //     info: "View stock transfers",
  //   },
  //   {
  //     title: "Transfer Stock",
  //     desc: "Stocks",
  //     type: "Stock",

  //     info: "Process stock transfers between locations",
  //   },

  //   // ACCOUNTING Start
  //   {
  //     title: "Show Account Tree",
  //     desc: "Accounting",
  //     type: "Accounting",

  //     info: "View chart of accounts",
  //   },
  //   {
  //     title: "Account Tree",
  //     desc: "Accounting",
  //     type: "Accounting",

  //     info: "Manage chart of accounts",
  //   },
  //   {
  //     title: "Delete Account Tree",
  //     desc: "Accounting",
  //     type: "Accounting",

  //     info: "Remove accounts from chart",
  //   },
  //   {
  //     title: "Import & Export Account Tree",
  //     desc: "Accounting",
  //     type: "Accounting",

  //     info: "Import/export account structures",
  //   },
  //   {
  //     title: "Make Journal Entry",
  //     desc: "Accounting",
  //     type: "Accounting",

  //     info: "Create accounting journal entries",
  //   },
  //   {
  //     title: "Show Journal Entry",
  //     desc: "Accounting",
  //     type: "Accounting",

  //     info: "View accounting journal entries",
  //   },
  //   {
  //     title: "Show Linked Panel",
  //     desc: "Accounting",
  //     type: "Accounting",

  //     info: "View account linking panel",
  //   },
  //   {
  //     title: "Link Account",
  //     desc: "Accounting",
  //     type: "Accounting",

  //     info: "Link accounting accounts",
  //   },

  //   // REPORTS Start
  //   {
  //     title: "Expense Reports",
  //     desc: "Reports",
  //     type: "Accounting",

  //     info: "View expense analysis reports",
  //   },
  //   {
  //     title: "Profit and Loss Report",
  //     desc: "Reports",
  //     type: "Accounting",

  //     info: "View profit and loss statements",
  //   },

  //   // POS SALES Start
  //   {
  //     title: "Show Sales Point",
  //     desc: "Sales Point",
  //     type: "POS",

  //     info: "View point of sale interface",
  //   },
  //   {
  //     title: "Add Sales Point",
  //     desc: "Sales Point",
  //     type: "POS",
  //     info: "Create new point of sale terminals",
  //   },

  //   //Offers Start
  //   {
  //     title: "Show POS Offers",
  //     desc: "Offers",
  //     type: "POS",
  //     info: "View point of sale promotions",
  //   },
  //   {
  //     title: "POS Offers",
  //     desc: "Offers",
  //     type: "POS",
  //     info: "Create and edit POS promotions",
  //   },
  //   {
  //     title: "Delete POS Offers",
  //     desc: "Offers",
  //     type: "POS",
  //     info: "Remove POS promotions",
  //   },

  //   // POS Sales Invoices Start
  //   {
  //     title: "Show POS Sales Invoices",
  //     desc: "POS Sales Invoices",
  //     type: "POS",
  //     info: "View POS sales invoices",
  //   },
  //   {
  //     title: "Edit Sales Invoices",
  //     desc: "POS Sales Invoices",
  //     type: "POS",
  //     info: "Modify POS sales invoices",
  //   },
  //   {
  //     title: "Cancel Sales Invoices",
  //     desc: "POS Sales Invoices",
  //     info: "Cancel POS sales invoices",
  //   },
  //   {
  //     title: "Refund Sales Invoices",
  //     desc: "POS Sales Invoices",
  //     type: "POS",
  //     info: "Process POS invoice refunds",
  //   },
  //   {
  //     title: "Show Refund Sales Invoices",
  //     desc: "POS Sales Invoices",
  //     type: "POS",
  //     info: "View POS refund invoices",
  //   },

  //   // ECOMMERCE Start
  //   {
  //     title: "Show Ecommerce Dashbord",
  //     desc: "Ecommerce",
  //     type: "Ecommerce",
  //     info: "View ecommerce dashboard and reports",
  //   },

  //   // Order Management Start
  //   {
  //     title: "Show Orders",
  //     desc: "Order Management",
  //     type: "Ecommerce",

  //     info: "View ecommerce orders",
  //   },
  //   {
  //     title: "Ecommerc Orders",
  //     desc: "Order Management",
  //     type: "Ecommerce",

  //     info: "Update ecommerce order status",
  //   },
  //   {
  //     title: "Cancel Orders",
  //     desc: "Order Management",
  //     type: "Ecommerce",

  //     info: "Cancel ecommerce orders",
  //   },
  //   {
  //     title: "Convert Orders",
  //     desc: "Order Management",
  //     type: "Ecommerce",

  //     info: "Convert ecommerce orders to invoices",
  //   },

  //   // Ecommerc Product Start
  //   {
  //     title: "Show Ecommerce Product",
  //     desc: "Ecommerce",
  //     type: "Ecommerce",

  //     info: "View online store products",
  //   },
  //   {
  //     title: "Ecommerce Product",
  //     desc: "Ecommerce",
  //     type: "Ecommerce",

  //     info: "Add and remove online products",
  //   },
  //   {
  //     title: "Publish Ecommerce Product",
  //     desc: "Ecommerce",
  //     type: "Ecommerce",

  //     info: "Publish/unpublish products online",
  //   },
  //   {
  //     title: "Edit Ecommerce Product",
  //     desc: "Ecommerce",
  //     type: "Ecommerce",

  //     info: "Modify product details (price, discount, etc)",
  //   },

  //   // Ecommerc Offer Start
  //   {
  //     title: "Show Ecommerce Offer",
  //     desc: "Ecommerce Offer",
  //     type: "Ecommerce",

  //     info: "View online promotions",
  //   },
  //   {
  //     title: "Ecommerce Offer",
  //     desc: "Ecommerce Offer",
  //     type: "Ecommerce",

  //     info: "Create and edit online promotions",
  //   },
  //   {
  //     title: "Delete Ecommerce Offer",
  //     desc: "Ecommerce Offer",
  //     type: "Ecommerce",

  //     info: "Remove online promotions",
  //   },

  //   // Ecommerc Setting Start
  //   {
  //     title: "Show Setting",
  //     desc: "Ecommerce Setting",
  //     type: "Ecommerce",

  //     info: "View ecommerce settings",
  //   },
  //   {
  //     title: "Edit Setting",
  //     desc: "Ecommerce Setting",
  //     type: "Ecommerce",

  //     info: "Modify all ecommerce settings",
  //   },

  //   // Ecommerc User Start
  //   {
  //     title: "Show Ecommerce User",
  //     desc: "Ecommerce User",
  //     type: "Ecommerce",

  //     info: "View online store customers",
  //   },
  //   {
  //     title: "Add Ecommerce User",
  //     desc: "Ecommerce User",
  //     type: "Ecommerce",

  //     info: "Create new online store accounts",
  //   },
  //   {
  //     title: "Edit Ecommerce User",
  //     desc: "Ecommerce User",
  //     type: "Ecommerce",

  //     info: "Modify customer accounts",
  //   },
  //   {
  //     title: "Delete Ecommerce User",
  //     desc: "Ecommerce User",
  //     type: "Ecommerce",

  //     info: "Remove customer accounts",
  //   },
  //   {
  //     title: "Show Ecommerce Order",
  //     desc: "Ecommerce User",
  //     type: "Ecommerce",

  //     info: "View customer order history",
  //   },

  //   // Shipping Company Start
  //   {
  //     title: "Show Shipping Company",
  //     desc: "Shipping Company",
  //     type: "Ecommerce",

  //     info: "View shipping providers",
  //   },
  //   {
  //     title: "Shipping Company",
  //     desc: "Shipping Company",
  //     type: "Ecommerce",

  //     info: "Add and edit shipping providers",
  //   },
  //   {
  //     title: "Delete Shipping Company",
  //     desc: "Shipping Company",
  //     type: "Ecommerce",

  //     info: "Remove shipping providers",
  //   },
  //   {
  //     title: "Pricing Shipping Company",
  //     desc: "Shipping Company",
  //     type: "Ecommerce",

  //     info: "Manage shipping rates and pricing",
  //   },

  //   // Ecommerc Payment Method Start
  //   {
  //     title: "Show Payment Method",
  //     desc: "Ecommerce Payment Method",
  //     type: "Ecommerce",

  //     info: "View online payment options",
  //   },
  //   {
  //     title: "Edit Payment Method",
  //     desc: "Ecommerce Payment Method",
  //     type: "Ecommerce",

  //     info: "Configure payment methods",
  //   },

  //   // HUMAN RESOURCES Start
  //   {
  //     title: "Show Staff",
  //     desc: "Staff",
  //     type: "HR",

  //     info: "View staff members",
  //   },
  //   {
  //     title: "Staff",
  //     desc: "Staff",
  //     type: "HR",

  //     info: "Add and edit staff information",
  //   },
  //   {
  //     title: "Delete Staff",
  //     desc: "Staff",
  //     type: "HR",

  //     info: "Remove staff members",
  //   },
  //   {
  //     title: "Pay Salary",
  //     desc: "Staff",
  //     type: "HR",

  //     info: "Process staff payroll",
  //   },

  //   // TECHNICAL SERVICE Start
  //   {
  //     title: "Show Maintenance Client",
  //     desc: "Technical Service",
  //     type: "Maintenance",

  //     info: "View service clients",
  //   },
  //   {
  //     title: "Maintenance Client",
  //     desc: "Technical Service",
  //     type: "Maintenance",

  //     info: "Add and edit service clients",
  //   },
  //   {
  //     title: "Add Device",
  //     desc: "Technical Service",
  //     type: "Maintenance",

  //     info: "Register client devices",
  //   },
  //   {
  //     title: "Show Client Device",
  //     desc: "Technical Service",
  //     type: "Maintenance",

  //     info: "View client devices",
  //   },
  //   {
  //     title: "Add Case",
  //     desc: "Technical Service",
  //     info: "Create service tickets",
  //   },
  //   {
  //     title: "Show Cases",
  //     desc: "Technical Service",
  //     type: "Maintenance",

  //     info: "View service tickets",
  //   },
  //   {
  //     title: "Add Connection",
  //     desc: "Technical Service",
  //     type: "Maintenance",

  //     info: "Log service interactions (reception/delivery)",
  //   },
  //   {
  //     title: "Technical",
  //     desc: "Technical Service",
  //     type: "Maintenance",

  //     info: "Perform technical work (parts, pricing)",
  //   },
  //   {
  //     title: "Convert To Invoice",
  //     desc: "Technical Service",
  //     type: "Maintenance",

  //     info: "Convert service cases to invoices",
  //   },

  //   //SETTINGS Start
  //   {
  //     title: "Show Company Info",
  //     desc: "Company",
  //     type: "General",
  //     info: "View company information",
  //   },
  //   {
  //     title: "Edit Company Info",
  //     desc: "Company",
  //     type: "General",

  //     info: "Update company details",
  //   },

  //   // Definitions Start
  //   {
  //     title: "Show Definitions",
  //     desc: "Definitions",
  //     type: "General",

  //     info: "View system definitions (brands, taxes, tags)",
  //   },
  //   {
  //     title: "Definitions",
  //     desc: "Definitions",

  //     type: "General",

  //     info: "Manage system definitions",
  //   },
  //   {
  //     title: "Delete Definitions",
  //     desc: "Definitions",

  //     type: "General",

  //     info: "Remove system definitions",
  //   },

  //   // Currencies Start
  //   {
  //     title: "Show Currencies",
  //     desc: "Currencies",
  //     type: "General",

  //     info: "View currency settings",
  //   },
  //   {
  //     title: "Currencies",
  //     desc: "Currencies",
  //     type: "General",

  //     info: "Manage currency options",
  //   },
  //   {
  //     title: "Delete Currencies",
  //     desc: "Currencies",
  //     type: "General",

  //     info: "Remove currency options",
  //   },

  //   // User Start
  //   {
  //     title: "Show User",
  //     desc: "Users",
  //     type: "General",

  //     info: "View system users",
  //   },
  //   {
  //     title: "User",
  //     desc: "Users",
  //     type: "General",

  //     info: "Add and edit user accounts",
  //   },
  //   {
  //     title: "Delete User",
  //     desc: "Users",
  //     type: "General",

  //     info: "Remove user accounts",
  //   },

  //   // Roles Start
  //   {
  //     title: "Show Roles",
  //     desc: "Roles",
  //     type: "General",

  //     info: "View user roles",
  //   },
  //   {
  //     title: "Roles",
  //     desc: "Roles",
  //     type: "General",

  //     info: "Create and edit user roles",
  //   },
  //   {
  //     title: "Delete Roles",
  //     desc: "Roles",
  //     type: "General",

  //     info: "Remove user roles",
  //   },

  //   //DISCOUNTS Start
  //   {
  //     title: "Show Discounts",
  //     desc: "Discounts",
  //     type: "General",

  //     info: "View discount rules",
  //   },
  //   {
  //     title: "Discounts",
  //     desc: "Discounts",
  //     type: "General",

  //     info: "Create and edit discounts",
  //   },
  //   {
  //     title: "Delete Discounts",
  //     desc: "Discounts",
  //     type: "General",
  //     info: "Remove discount rules",
  //   },
  // ];
  const dashboardRoles = await roleDashboardModel.find();
  // const mainDashboardRoles = await roleDashboardModel.insertMany(
  //   allDashRoles
  // );

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
  console.log(companyInfos);

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
