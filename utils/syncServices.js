const mongoose = require("mongoose");
const categorySchema = require("../models/CategoryModel");
const E_user_Schema = require("../models/ecommerce/E_user_Modal");
const cartSchema = require("../models/ecommerce/cartModel");
const ecommerceOrderSchema = require("../models/ecommerce/ecommerceOrderModel");
const ecommercePaymentMethodSchema = require("../models/ecommerce/ecommercePaymentMethodModel");
const footerSchema = require("../models/ecommerce/footerModel");
const productQuestionsSchema = require("../models/ecommerce/productQuestionsModel");
const reviewSchema = require("../models/ecommerce/reviewModel");
const silderSchema = require("../models/ecommerce/sliderModel");
const thirdPartyAuthSchema = require("../models/ecommerce/thirdPartyAuthModel");
const fingerPrintSchema = require("../models/Hr/fingerprintModel");
const SalaryHistorySchema = require("../models/Hr/salaryHistoryModel");
const StaffSchema = require("../models/Hr/staffModel");
const devicesSchema = require("../models/maintenance/devicesModel");
const manitenaceUserSchema = require("../models/maintenance/manitenaceUserModel");
const manitencesCaseSchema = require("../models/maintenance/manitencesCaseModel");
const batchSchema = require("../models/resturant_management/batchModel");
const manufactorProductSchema = require("../models/resturant_management/manufatorProductModel");
const menuCategorySchema = require("../models/resturant_management/menuCategoryModel");
const rawMaterialSchema = require("../models/resturant_management/rawMaterialModel");
const recipeSchema = require("../models/resturant_management/recipeModel");
const AccountingTreeSchema = require("../models/accountingTreeModel");
const assetsSchema = require("../models/assetsModel");
const brandSchema = require("../models/brandModel");
const companyIfnoSchema = require("../models/companyInfoModel");
const currencySchema = require("../models/currencyModel");
const customarSchema = require("../models/customarModel");
const emoloyeeShcema = require("../models/employeeModel");
const expensesCategorySchama = require("../models/expensesCategoryModel");
const expensesSchema = require("../models/expensesModel");
const financialFundsSchema = require("../models/financialFundsModel");
const FinancialLossSchema = require("../models/financialLossModel");
const invoiceHistorySchema = require("../models/invoiceHistoryModel");
const journalEntrySchema = require("../models/journalEntryModel");
const labelsSchema = require("../models/labelsModel");
const LinkPanelSchema = require("../models/linkPanelModel");
const offerSchema = require("../models/offersModel");
const orderSchema = require("../models/orderModel");
const PaymentHistorySchema = require("../models/paymentHistoryModel");
const PaymentSchema = require("../models/paymentModel");
const paymentTypesSchema = require("../models/paymentTypesModel");
const ProductMovementSchema = require("../models/productMovementModel");
const productSchema = require("../models/productModel");
const ProfitLossReportsSchema = require("../models/profitLossReports");
const PurchaseInvoicesSchema = require("../models/purchaseinvoicesModel");
const purchaseRequestSchema = require("../models/purchaseRequestModel");
const quotationSchema = require("../models/quotationsModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const ReportsSalesSchema = require("../models/reportsSalesModel");
const roleDashboardSchema = require("../models/roleDashboardModel");
const rolesShcema = require("../models/roleModel");
const SalesPointSchema = require("../models/salesPointModel");
const orderFishSchema = require("../models/orderModelFish");
const soldReportSchema = require("../models/soldReportModel");
const stockReconcilSchema = require("../models/stockReconciliationModel");
const stockSchema = require("../models/stockModel");
const supplierSchema = require("../models/suppliersModel");
const tagsSchema = require("../models/tagModel");
const TaxSchema = require("../models/taxModel");
const UnitSchema = require("../models/UnitsModel");
const UnTracedproductLogSchema = require("../models/unTracedproductLogModel");

const models = [
  //Ecommerce
  { name: "Users", schema: E_user_Schema },
  { name: "Cart", schema: cartSchema },
  { name: "EcommerceOrder", schema: ecommerceOrderSchema },
  { name: "ecommercePaymentMethods", schema: ecommercePaymentMethodSchema },
  { name: "ecommerceSettings", schema: ecommerceSettingsSchema },
  { name: "footer", schema: footerSchema },
  { name: "page", schema: pageSchema },
  { name: "ProductQuestions", schema: productQuestionsSchema },
  { name: "Review", schema: reviewSchema },
  { name: "EcomeerceSlider", schema: silderSchema },
  { name: "ThirdPartyAuth", schema: thirdPartyAuthSchema },

  //HR
  { name: "FingerPrint", schema: fingerPrintSchema },
  { name: "SalaryHistory", schema: SalaryHistorySchema },
  { name: "staff", schema: StaffSchema },

  //Maintenance
  { name: "Device", schema: devicesSchema },
  { name: "manitUser", schema: manitenaceUserSchema },
  { name: "manitencesCase", schema: manitencesCaseSchema },

  //resturant_management
  { name: "Batch", schema: batchSchema },
  { name: "manufactorProduct", schema: manufactorProductSchema },
  { name: "menuCategory", schema: menuCategorySchema },
  { name: "RawMaterial", schema: rawMaterialSchema },
  { name: "Recipe", schema: recipeSchema },

  //Accounting
  { name: "AccountingTree", schema: AccountingTreeSchema },
  { name: "Assets", schema: assetsSchema },
  { name: "brand", schema: brandSchema },
  { name: "Category", schema: categorySchema },
  { name: "CompanyInfo", schema: companyIfnoSchema },
  { name: "Currency", schema: currencySchema },
  { name: "Customar", schema: customarSchema },
  { name: "Discount", schema: discountSchema },
  { name: "Employee", schema: emoloyeeShcema },
  { name: "ExpensesCategory", schema: expensesCategorySchama },
  { name: "expenses", schema: expensesSchema },
  { name: "FinancialFunds", schema: financialFundsSchema },
  { name: "FinancialLoss", schema: FinancialLossSchema },
  { name: "invoiceHistory", schema: invoiceHistorySchema },
  { name: "journalEntry", schema: journalEntrySchema },
  { name: "Labels", schema: labelsSchema },
  { name: "linkPanel", schema: LinkPanelSchema },
  { name: "Offer", schema: offerSchema },
  { name: "Sales", schema: orderSchema },
  { name: "PaymentHistory", schema: PaymentHistorySchema },
  { name: "Payment", schema: PaymentSchema },
  { name: "PaymentType", schema: paymentTypesSchema },
  { name: "ProductMovement", schema: ProductMovementSchema },
  { name: "Product", schema: productSchema },
  { name: "ProfitLossReports", schema: ProfitLossReportsSchema },
  { name: "PurchaseInvoices", schema: PurchaseInvoicesSchema },
  { name: "PurchaseRequest", schema: purchaseRequestSchema },
  { name: "Quotations", schema: quotationSchema },
  { name: "ReportsFinancialFunds", schema: reportsFinancialFundsSchema },
  { name: "ReportsSales", schema: ReportsSalesSchema },
  { name: "RoleDashboard", schema: roleDashboardSchema },
  { name: "Roles", schema: rolesShcema },
  { name: "salesPoints", schema: SalesPointSchema },
  { name: "orderFishPos", schema: orderFishSchema },
  { name: "shippingCompanies", schema: shippingCompaniesSchema },
  { name: "SoldReport", schema: soldReportSchema },
  { name: "Reconciliation", schema: stockReconcilSchema },
  { name: "Stock", schema: stockSchema },
  { name: "Supplier", schema: supplierSchema },
  { name: "Tags", schema: tagsSchema },
  { name: "Tax", schema: TaxSchema },
  { name: "Unit", schema: UnitSchema },
  { name: "unTracedproductLog", schema: UnTracedproductLogSchema },
];
// connect to giver data
const connectToAtlas = async () => {
  try {
    const atlasURI =
      "mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/kai?retryWrites=true&w=majority";
    const atlasConnection = await mongoose.createConnection(atlasURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB Atlas");
    return atlasConnection;
  } catch (error) {
    console.error("Failed to connect to Atlas:", error);
    process.exit(1);
  }
};

// connect to Taker data
const connectToLocalDB = async () => {
  try {
    const localURI =
      "mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/aaaaa?retryWrites=true&w=majority";
    const localConnection = await mongoose.createConnection(localURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to Local DB");
    return localConnection;
  } catch (error) {
    console.error("Failed to connect to Local DB:", error);
    process.exit(1);
  }
};

async function syncAllData() {
  try {
    console.log("Starting synchronization...");
    const atlasConnection = await connectToAtlas();
    const localConnection = await connectToLocalDB();

    for (const model of models) {
      console.log(`Synchronizing ${model.name}...`);

      const atlasModel = atlasConnection.model(model.name, model.schema);
      const localModel = localConnection.model(model.name, model.schema);

      // Fetch unsynchronized records from Atlas
      const atlasRecords = await atlasModel.find({ sync: false });
      const localBulkOps = atlasRecords.map((record) => ({
        updateOne: {
          filter: { _id: record._id },
          update: { ...record.toObject(), sync: true },
          upsert: true,
        },
      }));

      if (localBulkOps.length > 0) {
        await localModel.bulkWrite(localBulkOps);
        console.log(`Synced ${model.name} from Atlas to Local`);
      }
    }
    // const localRecords = await localModel.find({ sync: false });
    // const atlasBulkOps = localRecords.map((record) => ({
    //   updateOne: {
    //     filter: { _id: record._id },
    //     update: { ...record.toObject(), sync: true },
    //     upsert: true,
    //   },
    // }));
    // if (atlasBulkOps.length > 0) {
    //   await atlasModel.bulkWrite(atlasBulkOps);
    //   console.log(`Synced Category from Local to Atlas`);
    // }

    console.log("Synchronization completed successfully!");
  } catch (error) {
    console.error("Synchronization error:", error);
  } finally {
    console.log("Disconnected from all MongoDB connections");
  }
}

module.exports = { syncAllData };
