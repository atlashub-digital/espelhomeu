import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const market = pgEnum("market", ["PT", "BR"]);
export const consentPurpose = pgEnum("consent_purpose", [
  "account",
  "photo_processing",
  "agent_memory",
  "testimonial",
  "marketing_email",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  market: market("market").notNull(),
  birthYear: integer("birth_year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Pedido de apagamento (RGPD art. 17 / LGPD art. 18): dados removidos por job assíncrono.
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
});

/** Histórico append-only: cada concessão ou revogação é uma linha nova. */
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
