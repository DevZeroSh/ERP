const fingerPrintRout = require("./Hr/FingerPrintRout");
const paymentHistoryRout = require("./paymentHistoryRout");
const brandRout = require("./brandRout");
const categoryRout = require("./categoryRout");
const companyInfoRoute = require("./companyInfoRoute");
const currencyRoute = require("./currencyRoute");
const discountRoute = require("./discountRoute");
const addressRout = require("./ecommerce/addressRout");
const cartRout = require("./ecommerce/cartRout");
const ecommerceOrderRouter = require("./ecommerce/ecommerceOrderRout");
const reviewRout = require("./ecommerce/reviewRout");
const wishlistRouter = require("./ecommerce/wishlistRout");
const employeeRoute = require("./employeeRoute");
const expenseCategoriesRoute = require("./expensesCategoryRoute");
const expensesRoute = require("./expensesRoute");
const financialFundsRoute = require("./financialFundsRoute");
const invoiceHistoryRoute = require("./invoiceHistoryRoute");
const LabelRout = require("./labelsRout");
const OrderRout = require("./orderRout");
const paymentRout = require("./paymentRoute");
const paymentTypes = require("./paymentTypesRoute");
const productMovementsRoute = require("./productMovementRoute");
const productRout = require("./productRout");
const PurchaseInvoices = require("./purchaseInvoices");
const reportsFinancialFundRoute = require("./reportsFinancialFundsRoute");
const RoleDashboardRoute = require("./roleDashboardRoute");
const StockReconciliationRoute = require("./stockReconciliationRoute");
const taxRout = require("./taxRout");
const unitRout = require("./unitRout");
const authRoute = require("./authRoute");
const customarRoute = require("./customarRoute");
const supplierRoute = require("./supplierRoute");
const roleRoute = require("./roleRoute");
const stockRout = require("./stokRoute");
const footerRout = require("./ecommerce/footerRout");
const offersRouter = require("./offersRoute");
const paytrRouter = require("./ecommerce/paytrRoute");
const devicesRout = require("./maintenance/devicesRout");
const quotationRouter = require("./quotationRoute");
const E_userRoute = require("./ecommerce/E_usersRoutes");
const SalesPosRout = require("./salesPosRoute");
const thirdPartyRoute = require("./ecommerce/thirdPartyAuthRoute");
const accountingTreeRout = require("./accountingTreeRoute");
const manitUserRout = require("./maintenance/maintenanceUserRoute");
const manitCaseRout = require("./maintenance/manitencesCaseRoute");
const shippingCompaniesRoute = require("./shippingCompaniesRoute");
const ecommercePaymentMethodRoute = require("./ecommerce/ecommercePaymentMethodRoute");
const purchaseRequestRouter = require("./purchaseRequestRoute");
const accountingRoute = require("./journalEntryRoute");
const unTracedproductLogRout = require("./unTracedproductLogRout");
const TagRoute = require("./tagsRoute");
const SalesPointRout = require("./salesPointRoute");
const linkPanelRoute = require("./LinkPanelRout");
const staffRout = require("./Hr/staffRout");
const questionsRoute = require("./ecommerce/productQuestionsRoute");
const ecommerceSettingsRoute = require("./ecommerce/ecommerceSettingsRoute");
const hepsiJetRouter = require("./ecommerce/hepsiJetRoute");
const noticesRouter = require("./noticesRoute");
const salaryHistoryRoute = require("./Hr/salaryHistoryRoute");
const batchRoute = require("./resturant_management/batchRoute");
const rawMaterialRoute = require("./resturant_management/rawMaterialRoute");
const recipeRoute = require("./resturant_management/recipeRoute");
const manufactorProductRoute = require("./resturant_management/manufatorProductRoute");
const menuCategoryRout = require("./resturant_management/menuCategoryRoute");
const positionsRout = require("./Hr/positionsRoute");
const efaturaRoute = require("./efatura/efaturaRoute");
const assetCategoryRoute = require("./assetCategoryRoute");
const finalAsset = require("./finalAssetRoute");
const assetCardRoute = require("./assetCardRoute");
const investorRoute = require("./investorRoute");
const investmentCompaniesRoute = require("./investmentCompaniesRoute");
const investorSharesRoute = require("./investorSharesRoute");

const mountRoutes = (app) => {
  app.use("/api/product", productRout);
  app.use("/api/brand", brandRout);
  app.use("/api/category", categoryRout);
  app.use("/api/customars", customarRoute);
  app.use("/api/suppliers", supplierRoute);
  app.use("/api/roledashboard", RoleDashboardRoute);
  app.use("/api/role", roleRoute);
  app.use("/api/employee", employeeRoute);
  app.use("/api/discount", discountRoute);
  app.use("/api/unit", unitRout);
  app.use("/api/tax", taxRout);
  app.use("/api/paymenttype", paymentTypes);

  app.use("/api/label", LabelRout);
  app.use("/api/tag", TagRoute);
  app.use("/api/auth", authRoute);
  app.use("/api/orders", OrderRout);
  app.use("/api/currency", currencyRoute);
  app.use("/api/financialfunds", financialFundsRoute);
  app.use("/api/expenses", expensesRoute);
  app.use("/api/productinvoices", PurchaseInvoices);
  app.use("/api/expenseCategories", expenseCategoriesRoute);
  app.use("/api/companyinfo", companyInfoRoute);
  app.use("/api/financialfundsreports", reportsFinancialFundRoute);
  app.use("/api/stockreconciliation", StockReconciliationRoute);
  app.use("/api/productmovements", productMovementsRoute);
  app.use("/api/invoicehistory", invoiceHistoryRoute);
  app.use("/api/payment", paymentRout);
  app.use("/api/payment-history", paymentHistoryRout);
  app.use("/api/stock", stockRout);
  app.use("/api/offers", offersRouter);
  app.use("/api/quotation", quotationRouter);
  app.use("/api/sales-pos", SalesPosRout);
  app.use("/api/accounting-tree", accountingTreeRout);
  app.use("/api/journal", accountingRoute);
  app.use("/api/purchaserequest", purchaseRequestRouter);
  app.use("/api/shippingCompany", shippingCompaniesRoute);
  app.use("/api/untracedproductlog", unTracedproductLogRout);
  app.use("/api/salespoint", SalesPointRout);
  app.use("/api/linkpanel", linkPanelRoute);
  app.use("/api/notices", noticesRouter);
  app.use("/api/assetcategory", assetCategoryRoute);
  app.use("/api/finalasset", finalAsset);
  app.use("/api/assetcard", assetCardRoute);

  //Ecommerce routes
  app.use("/api/users", E_userRoute);
  app.use("/api/cart", cartRout);
  app.use("/api/wishlist", wishlistRouter);
  app.use("/api/addresses", addressRout);
  app.use("/api/ecommerce-order-router", ecommerceOrderRouter);
  app.use("/api/review", reviewRout);
  app.use("/api/questions", questionsRoute);
  app.use("/api/ecommerceSettings", ecommerceSettingsRoute);
  app.use("/api/footer", footerRout);
  app.use("/api/thirdPartyAuth", thirdPartyRoute);
  app.use("/api/ecommercePaymentMethods", ecommercePaymentMethodRoute);

  //HepsiJet
  app.use("/api/hepsijet", hepsiJetRouter);

  //E-Fatura
  app.use("/api/efatura", efaturaRoute);

  //Hr
  app.use("/api/staff", staffRout);
  app.use("/api/finger-print", fingerPrintRout);
  app.use("/api/salary-history", salaryHistoryRoute);
  app.use("/api/positions", positionsRout);

  //Payment
  app.use("/api", paytrRouter);

  //Maintenance
  app.use("/api/device", devicesRout);
  app.use("/api/manituser", manitUserRout);
  app.use("/api/manitcase", manitCaseRout);

  //resturant_management
  app.use("/api/batch", batchRoute);
  app.use("/api/rawMaterial", rawMaterialRoute);
  app.use("/api/recipe", recipeRoute);
  app.use("/api/manufactorProduct", manufactorProductRoute);
  app.use("/api/menu-category", menuCategoryRout);

  //Investment
  app.use("/api/investor", investorRoute);
  app.use("/api/investmentCompanies", investmentCompaniesRoute);
  app.use("/api/investorShares", investorSharesRoute);
};
module.exports = mountRoutes;
