import * as coda from "@codahq/packs-sdk";

/*
 * Schemas for your formulas and sync tables go here, for example:
 */

export const WalletSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  id: "id",
  primary: "name",
  featured: ['balance', 'currency', 'balance_str', 'balance_usd', 'current_price'],
  properties: {
    id: { type: coda.ValueType.String },
    name: { type: coda.ValueType.String },
    balance: { type: coda.ValueType.Number },
    currency: { type: coda.ValueType.String },
    balance_str: { type: coda.ValueType.String },
    balance_usd: { type: coda.ValueType.Number, codaType: coda.ValueHintType.Currency },
    current_price: { type: coda.ValueType.Number, codaType: coda.ValueHintType.Currency },
  },
});

export const TransactionSchema = coda.makeObjectSchema({
  type: coda.ValueType.Object,
  id: "id",
  primary: "description",
  featured: ['wallet', 'type', 'updated_at', 'status', 'amount_crypto', 'amount_fiat'],
  properties: {
    id: { type: coda.ValueType.Number },
    wallet: WalletSchema,
    type: { type: coda.ValueType.String },
    status: { type: coda.ValueType.String },
    amount_crypto: {
      type: coda.ValueType.Object,
      primary: 'as_string',
      properties: {
        amount: { type: coda.ValueType.Number },
        currency: { type: coda.ValueType.String },
        as_string: { type: coda.ValueType.String },
      }
    },
    amount_fiat: {
      type: coda.ValueType.Object,
      primary: 'as_string',
      properties: {
        amount: { type: coda.ValueType.Number, codaType: coda.ValueHintType.Currency },
        currency: { type: coda.ValueType.String },
        as_string: { type: coda.ValueType.String },
      }
    },
    created_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    updated_at: { type: coda.ValueType.String, codaType: coda.ValueHintType.DateTime },
    title: { type: coda.ValueType.String },
    subtitle: { type: coda.ValueType.String },
    description: { type: coda.ValueType.String },
    health: { type: coda.ValueType.String },
  },
});
