import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const market = pgEnum("market", ["PT", "BR"]);
export const consentPurpose = pgEnum("consent_purpose", [
  "account",
  "photo_processing",
  "agent_memory",
  "testimonial",
  "marketing_email",
]);
export const orderStatus = pgEnum("order_status", [
  "created",
  "pending",
  "approved",
  "failed",
  "canceled",
  "refunded",
  "chargeback",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  market: market("market").notNull(),
  birthYear: integer("birth_year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
});

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  purpose: consentPurpose("purpose").notNull(),
  granted: boolean("granted").notNull(),
  textVersion: text("text_version").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  market: market("market").notNull(),
  consentVersion: text("consent_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("stripe"),
    providerSessionId: text("provider_session_id"),
    baseOfferId: text("base_offer_id").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("BRL"),
    buyerEmail: text("buyer_email"),
    claimSecretHash: text("claim_secret_hash").notNull(),
    status: orderStatus("status").notNull().default("created"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_provider_session_unique").on(table.providerSessionId),
  ],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  offerId: text("offer_id").notNull(),
  title: text("title").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerEventId: text("provider_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payloadHash: text("payload_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productRef: text("product_ref").notNull(),
    active: boolean("active").notNull().default(true),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("entitlements_order_product_unique").on(
      table.orderId,
      table.productRef,
    ),
  ],
);

export const accessTokens = pgTable("access_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
