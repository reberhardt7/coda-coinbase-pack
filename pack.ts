import * as coda from "@codahq/packs-sdk";
import * as helpers from "./helpers";
import * as schemas from "./schemas";

export const pack = coda.newPack({ version: "5.3" });

pack.setUserAuthentication({
  type: coda.AuthenticationType.OAuth2,
  authorizationUrl: 'https://www.coinbase.com/oauth/authorize',
  tokenUrl: 'https://www.coinbase.com/oauth/token',
  scopes: ['wallet:accounts:read', 'wallet:transactions:read'],
  additionalParams: { account: 'all' },
});

// When using the fetcher, this is the domain of the API that your pack makes fetcher requests to.
pack.addNetworkDomain('api.coinbase.com');

async function getWalletInfo(wallet, context: coda.ExecutionContext) {
  const currentRate = Number((await context.fetcher.fetch({
    method: 'GET',
    url: `https://api.coinbase.com/v2/prices/${wallet.balance.currency}-USD/spot`,
    headers: { 'CB-VERSION': '2021-10-15' },
    cacheTtlSecs: 60,
  })).body.data.amount);
  return {
    id: wallet.id,
    name: wallet.name,
    balance: Number(wallet.balance.amount),
    balance_usd: Number(wallet.balance.amount) * currentRate,
    currency: wallet.balance.currency,
    balance_str: wallet.balance.amount + ' ' + wallet.balance.currency,
    current_price: currentRate,
  };
}

pack.addSyncTable({
  name: "Wallets",
  identityName: "Wallet",
  schema: schemas.WalletSchema,
  formula: {
    name: "GetWallets",
    description: "Load list of wallets",
    parameters: [],
    execute: async function ([], context) {
      const response = await context.fetcher.fetch({
        method: 'GET',
        url: 'https://api.coinbase.com/v2/accounts',
        headers: { 'CB-VERSION': '2021-10-15' },
      });
      const wallets = await Promise.all(response.body!.data.filter(
        (wallet) => wallet.updated_at && wallet.balance.amount > 0
      ).map((wallet) => getWalletInfo(wallet, context)));
      return {
        result: wallets,
        continuation: undefined,
      }
    },
  },
});

function getTransactionInfo(walletInfo, apiTransaction, context: coda.ExecutionContext) {
  return {
    id: apiTransaction.id,
    wallet: walletInfo,
    type: apiTransaction.type,
    status: apiTransaction.status,
    amount_crypto: {
      amount: Number(apiTransaction.amount.amount),
      currency: apiTransaction.amount.currency,
      as_string: `${apiTransaction.amount.amount} ${apiTransaction.amount.currency}`,
    },
    amount_fiat: {
      amount: Number(apiTransaction.native_amount.amount),
      currency: apiTransaction.native_amount.currency,
      as_string: `${apiTransaction.native_amount.amount} ${apiTransaction.native_amount.currency}`,
    },
    created_at: apiTransaction.created_at,
    updated_at: apiTransaction.updated_at,
    title: apiTransaction.details.title,
    subtitle: apiTransaction.details.subtitle,
    description: `${apiTransaction.details.title} ${apiTransaction.details.subtitle}`,
    health: apiTransaction.details.health,
  };
}

pack.addSyncTable({
  name: "Transactions",
  identityName: "Transaction",
  schema: schemas.TransactionSchema,
  formula: {
    name: "GetTransactions",
    description: "Load list of transactions",
    parameters: [],
    execute: async function ([], context) {
      const wallets = context.sync.continuation?.wallets || (await context.fetcher.fetch({
        method: 'GET',
        url: 'https://api.coinbase.com/v2/accounts',
        headers: { 'CB-VERSION': '2021-10-15' },
      })).body.data.filter((wallet) => wallet.updated_at);
      if (wallets.length == 0) {
        return { result: [], continuation: undefined };
      }

      const transactionsUrl = context.sync.continuation?.nextTransactionsUrl as string
        || `https://api.coinbase.com/v2/accounts/${wallets[0].id}/transactions`;
      console.log(`Transactions invoked. ${wallets.length} wallets remaining, transactionsUrl: ${transactionsUrl}`);
      const result = await context.fetcher.fetch({
        method: 'GET',
        url: transactionsUrl,
        headers: { 'CB-VERSION': '2021-10-15' },
      });
      const nextTransactionsUrl = result.body.pagination.next_uri
        && 'https://api.coinbase.com' + result.body.pagination.next_uri;
      const walletInfo = await getWalletInfo(wallets[0], context);
      return {
        result: result.body.data.map((transaction) => getTransactionInfo(walletInfo, transaction, context)),
        continuation: wallets.length > 0 ? {
          nextTransactionsUrl,
          wallets: nextTransactionsUrl ? wallets : wallets.slice(1),
        } : undefined,
      };
    },
  },
});
