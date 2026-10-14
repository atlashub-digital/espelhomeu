CREATE TYPE "public"."order_status" AS ENUM('created', 'pending', 'approved', 'failed', 'canceled', 'refunded', 'chargeback');
--> statement-breakpoint
CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text DEFAULT 'stripe' NOT NULL,
  "provider_session_id" text,
  "base_offer_id" text NOT NULL,
  "amount_minor" integer NOT NULL,
  "currency" text DEFAULT 'BRL' NOT NULL,
  "buyer_email" text,
  "claim_secret_hash" text NOT NULL,
  "status" "order_status" DEFAULT 'created' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_provider_session_unique" ON "orders" USING btree ("provider_session_id");
--> statement-breakpoint
CREATE TABLE "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "offer_id" text NOT NULL,
  "title" text NOT NULL,
  "amount_minor" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "payload_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payment_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "product_ref" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_order_product_unique" ON "entitlements" USING btree ("order_id","product_ref");
--> statement-breakpoint
CREATE TABLE "access_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "access_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
