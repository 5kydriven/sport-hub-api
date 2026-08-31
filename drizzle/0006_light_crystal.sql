CREATE TYPE "public"."court_sport" AS ENUM('basketball', 'badminton', 'volleyball', 'tennis', 'futsal');--> statement-breakpoint
CREATE TABLE "courts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sport" "court_sport" NOT NULL,
	"price_centavos" integer NOT NULL,
	"slot_duration_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courts_price_centavos_non_negative" CHECK ("courts"."price_centavos" >= 0),
	CONSTRAINT "courts_slot_duration_minutes_range" CHECK ("courts"."slot_duration_minutes" >= 15 AND "courts"."slot_duration_minutes" <= 480)
);
--> statement-breakpoint
ALTER TABLE "venues" DROP CONSTRAINT "venues_booking_advance_days_positive";--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courts_venue_idx" ON "courts" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courts_venue_name_unique" ON "courts" USING btree ("venue_id","name");--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_booking_advance_days_range" CHECK ("venues"."booking_advance_days" >= 1 AND "venues"."booking_advance_days" <= 365);