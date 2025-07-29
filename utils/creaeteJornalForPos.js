const AccountingTreeSchema = require("../models/accountingTreeModel");
const journalEntrySchema = require("../models/journalEntryModel");
const LinkPanelSchema = require("../models/linkPanelModel");

const createJournalForPos = async (req, db, customarLinkId) => {
  const accountingTree = db.model("AccountingTree", AccountingTreeSchema);
  const journalEntryModel = db.model("journalEntry", journalEntrySchema);
  const LinkPanelModel = db.model("linkPanel", LinkPanelSchema);
  try {
    const journalEntries = [];
    const financialFundsMap = new Map();
    const journalEntriesTaxMap = new Map();
    const journalEntriesFundMap = new Map();
    const nextCounterPayment = (await journalEntryModel.countDocuments()) + 1;

    let totalBuyingPrice = 0;
    let totalInvoiceDiscount = 0;
    let totalinFundPayment = 0;
    let exchangeRate = 1;
    req.body.invoiceGrandTotal -= req.body.manuallInvoiceDiscountValue;

    for (const item of req.body.cartItems) {
      exchangeRate = req.body.currency.exchangeRate;

      totalBuyingPrice += item.orginalBuyingPrice * item.soldQuantity;
    }

    for (const item of req.body.taxSummary) {
      try {
        const taxAccount = await accountingTree
          .findOneAndUpdate(
            { _id: item.salesAccountTax },
            { $inc: { creditor: item.discountTaxValue } },
            { new: true }
          )
          .populate({ path: "currency" });

        if (!taxAccount) {
          console.log(`Tax account not found for: ${item.salesAccountTax}`);
          continue;
        }

        const total = item.discountTaxValue || 0;
        if (taxAccount && taxAccount._id) {
          const existingEntry = journalEntriesTaxMap.get(
            taxAccount._id.toString()
          );

          if (existingEntry) {
            existingEntry.MainCredit += total;
            existingEntry.accountCredit +=
              (total / exchangeRate) * taxAccount.currency.exchangeRate;
          } else {
            journalEntriesTaxMap.set(taxAccount._id.toString(), {
              counter: 40,
              id: taxAccount.id,
              name: taxAccount.name,
              code: taxAccount.code,
              MainCredit: total / exchangeRate,
              accountCredit:
                (total / exchangeRate) * taxAccount.currency.exchangeRate,
              MainDebit: 0,
              accountDebit: 0,
              accountExRate: taxAccount.currency.exchangeRate,
              accountCurrency: taxAccount.currency.currencyCode,
              isPrimary: taxAccount.currency.is_primary,
              description: "Credit cost account for total before tax",
            });
          }
        } else {
          console.log("taxAccount is missing _id.");
        }
      } catch (err) {
        console.error("Error processing tax summary item:", err);
      }
    }
    for (const fund of req.body.financialFund) {
      const fundId = fund.fundId;
      if (financialFundsMap.has(fundId)) {
        financialFundsMap.get(fundId).allocatedAmount += fund.allocatedAmount;
      } else {
        financialFundsMap.set(fundId, {
          value: fundId,
          allocatedAmount: fund.allocatedAmount / fund.exchangeRate || 0,
          label: fund.fundName,
        });
      }

      const fundAccount = await accountingTree
        .findOneAndUpdate(
          { _id: fund.accountId },
          { $inc: { creditor: fund.allocatedAmount } },
          { new: true }
        )
        .populate({ path: "currency" });

      if (fundAccount && fundAccount._id) {
        const existingEntry = journalEntriesFundMap.get(
          fundAccount._id.toString()
        );

        if (existingEntry) {
          existingEntry.MainCredit += fund.allocatedAmount / fund.exchangeRate;
          existingEntry.accountCredit +=
            (fund.allocatedAmount / fund.exchangeRate) *
            fundAccount.currency.exchangeRate;
        } else {
          journalEntriesFundMap.set(fundAccount._id.toString(), {
            counter: 40,
            id: fundAccount.id,
            name: fundAccount.name,
            code: fundAccount.code,
            MainCredit: fund.allocatedAmount / fund.exchangeRate,
            accountCredit:
              (fund.allocatedAmount / fund.exchangeRate) *
              fundAccount.currency.exchangeRate,
            MainDebit: 0,
            accountDebit: 0,
            accountExRate: fundAccount.currency.exchangeRate,
            accountCurrency: fundAccount.currency.currencyCode,
            isPrimary: fundAccount.currency.is_primary,
            description: "Credit cost account for total before tax",
          });
        }
      } else {
        console.log("fundAccount is missing _id.");
      }

      totalinFundPayment += fund.allocatedAmount / fund.exchangeRate;
    }

    const findContLick = await LinkPanelModel.findOne({
      name: "cost of sold products",
    });
    const monetaryLink = await LinkPanelModel.findOne({ name: "monetary" });
    const stocksLink = await LinkPanelModel.findOne({ name: "Stocks" });
    const discountGranted = await LinkPanelModel.findOne({
      name: "Discount granted",
    });
    let customersLink = null;
    let customerAccount;
    if (customarLinkId === null) {
      customersLink = await LinkPanelModel.findOne({
        name: "Customers",
      });
      customerAccount = await accountingTree
        .findOneAndUpdate(
          { _id: customersLink?.accountData },
          { $inc: { debtor: req.body.invoiceGrandTotal } },
          { new: true }
        )
        .populate({ path: "currency" });
    } else {
      customersLink = await accountingTree.findOne({
        _id: customarLinkId,
      });
      customerAccount = await accountingTree
        .findOneAndUpdate(
          { _id: customarLinkId },
          { $inc: { debtor: req.body.invoiceGrandTotal } },
          { new: true }
        )
        .populate({ path: "currency" });
    }

    totalInvoiceDiscount +=
      (parseFloat(req.body.manuallInvoiceDiscountValue) +
        parseFloat(req.body.invoiceDiscount)) /
      exchangeRate;

    const costAccount = await accountingTree
      .findOneAndUpdate(
        { _id: findContLick?.accountData },
        { $inc: { debtor: totalBuyingPrice } },
        { new: true }
      )
      .populate({ path: "currency" });

    const monetaryAccount = await accountingTree
      .findOneAndUpdate(
        { _id: monetaryLink?.accountData },
        {
          $inc: {
            creditor:
              parseFloat(req.body.invoiceSubTotal) +
              parseFloat(req.body.invoiceDiscount) +
              parseFloat(req.body.manuallInvoiceDiscountValue),
          },
        },
        { new: true }
      )
      .populate({ path: "currency" });

    const stockAccount = await accountingTree
      .findOneAndUpdate(
        { _id: stocksLink?.accountData },
        { $inc: { creditor: totalBuyingPrice } },
        { new: true }
      )
      .populate({ path: "currency" });

    const discountGrantedAccount = await accountingTree
      .findOneAndUpdate(
        { _id: discountGranted?.accountData },
        { $inc: { creditor: totalInvoiceDiscount } },
        { new: true }
      )
      .populate({ path: "currency" });

    let counter = 1;
    if (customerAccount) {
      journalEntries.push({
        counter: counter++,
        id: customerAccount?._id,
        name: customerAccount?.name,
        code: customerAccount?.code,
        MainDebit: req.body.invoiceGrandTotal / exchangeRate,
        accountDebit:
          (req.body.invoiceGrandTotal / exchangeRate) *
          (customerAccount?.currency?.exchangeRate || 1),
        MainCredit: 0,
        accountCredit: 0,
        accountExRate: customerAccount?.currency?.exchangeRate || 1,
        accountCurrency: customerAccount?.currency?.currencyCode,
        isPrimary: customerAccount?.currency?.is_primary,
        description: "Credit cost account for total before tax",
      });
    }
    if (totalInvoiceDiscount > 0 && discountGrantedAccount !== null) {
      journalEntries.push({
        counter: counter++,
        id: discountGrantedAccount?._id,
        name: discountGrantedAccount?.name,
        code: discountGrantedAccount?.code,
        MainCredit: 0,
        accountCredit: 0,
        MainDebit: totalInvoiceDiscount,
        accountDebit:
          totalInvoiceDiscount *
          (discountGrantedAccount?.currency?.exchangeRate || 1),
        accountExRate: discountGrantedAccount?.currency?.exchangeRate || 1,
        accountCurrency: discountGrantedAccount?.currency?.currencyCode,
        isPrimary: discountGrantedAccount?.currency?.is_primary,
        description: "Credit cost account for total before tax",
      });
    }

    for (const [key, entry] of journalEntriesTaxMap.entries()) {
      journalEntries.push({
        counter: counter++,
        id: entry?.id,
        name: entry?.name,
        code: entry?.code,
        MainCredit: entry?.MainCredit,
        accountCredit: entry?.accountCredit,
        MainDebit: 0,
        accountDebit: 0,
        accountExRate: entry?.accountExRate,
        accountCurrency: entry?.accountCurrency,
        isPrimary: entry?.isPrimary,
        description: entry?.description,
      });
    }
    if (monetaryAccount) {
      journalEntries.push({
        counter: counter++,
        id: monetaryAccount?._id,
        name: monetaryAccount?.name,
        code: monetaryAccount?.code,
        MainCredit:
          (parseFloat(req.body.invoiceSubTotal) +
            parseFloat(req.body.invoiceDiscount) +
            parseFloat(req.body.manuallInvoiceDiscountValue)) /
          exchangeRate,
        accountCredit:
          ((parseFloat(req.body.invoiceSubTotal) +
            parseFloat(req.body.invoiceDiscount) +
            parseFloat(req.body.manuallInvoiceDiscountValue)) /
            exchangeRate) *
          (monetaryAccount?.currency?.exchangeRate || 1),
        MainDebit: 0,
        accountDebit: 0,
        accountExRate: monetaryAccount?.currency?.exchangeRate || 1,
        accountCurrency: monetaryAccount?.currency?.currencyCode,
        isPrimary: monetaryAccount?.currency?.is_primary,
        description: "Credit monetary account for total before tax",
      });
    }

    journalEntries.push({
      counter: counter++,
      id: costAccount?._id,
      name: costAccount?.name,
      code: costAccount?.code,
      MainDebit: totalBuyingPrice,
      accountDebit:
        totalBuyingPrice * (costAccount?.currency?.exchangeRate || 1),
      MainCredit: 0,
      accountCredit: 0,
      accountExRate: costAccount?.currency?.exchangeRate || 1,
      accountCurrency: costAccount.currency.currencyCode,
      isPrimary: costAccount.currency.is_primary,
      description: "Credit cost account for total before tax",
    });

    journalEntries.push({
      counter: counter++,
      id: stockAccount?._id,
      name: stockAccount?.name,
      code: stockAccount?.code,
      MainCredit: totalBuyingPrice,
      accountCredit:
        totalBuyingPrice * (stockAccount?.currency?.exchangeRate || 1),
      MainDebit: 0,
      accountDebit: 0,
      accountExRate: stockAccount?.currency?.exchangeRate || 1,
      accountCurrency: stockAccount?.currency?.currencyCode || 1,
      isPrimary: stockAccount?.currency?.is_primary || 1,
      description: "Credit cost account for total before tax",
    });
    journalEntries.push({
      counter: counter++,
      id: customerAccount?._id,
      name: customerAccount?.name,
      code: customerAccount?.code,
      MainDebit: req.body.invoiceGrandTotal / exchangeRate,
      accountDebit:
        (req.body.invoiceGrandTotal / exchangeRate) *
        (customerAccount?.currency?.exchangeRate || 1),
      MainCredit: 0,
      accountCredit: 0,
      accountExRate: customerAccount?.currency?.exchangeRate || 1,
      accountCurrency: customerAccount?.currency?.currencyCode,
      isPrimary: customerAccount?.currency?.is_primary,
      description: "Credit cost account for total before tax",
    });
    for (const [key, entry] of journalEntriesFundMap.entries()) {
      journalEntries.push({
        counter: counter++,
        id: entry?.id,
        name: entry?.name,
        code: entry?.code,
        MainCredit: entry?.MainCredit,
        accountCredit: entry?.accountCredit,
        MainDebit: 0,
        accountDebit: 0,
        accountExRate: entry?.accountExRate,
        accountCurrency: entry?.accountCurrency,
        isPrimary: entry?.isPrimary,
        description: entry?.description,
      });
    }

    await journalEntryModel.create({
      journalName: "POS " + nextCounterPayment,
      journalDebit:
        req.body.invoiceGrandTotal / exchangeRate +
        totalBuyingPrice +
        req.body.invoiceGrandTotal / exchangeRate +
        totalInvoiceDiscount,
      journalCredit:
        totalBuyingPrice +
        (parseFloat(req.body.invoiceSubTotal) +
          parseFloat(req.body.invoiceDiscount) +
          parseFloat(req.body.manuallInvoiceDiscountValue)) /
          exchangeRate +
        req.body.invoiceTax / exchangeRate +
        totalinFundPayment,
      journalAccounts: journalEntries,
      journalDate: new Date().toISOString(),
      counter: nextCounterPayment,
    });
  } catch (error) {
    console.error("Error fetching subscriber databases:", error);
    return [];
  }
};

module.exports = createJournalForPos;
