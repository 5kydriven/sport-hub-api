CREATE TABLE "gym_owner_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"booking_advance_days" integer NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_latitude_range" CHECK ("venues"."latitude" >= -90 AND "venues"."latitude" <= 90),
	CONSTRAINT "venues_longitude_range" CHECK ("venues"."longitude" >= -180 AND "venues"."longitude" <= 180),
	CONSTRAINT "venues_booking_advance_days_positive" CHECK ("venues"."booking_advance_days" >= 1)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gym_owner_profiles" ADD CONSTRAINT "gym_owner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
-- Existing accounts predate mandatory onboarding. Preserve their current access
-- while materializing the profile records introduced by this migration.
INSERT INTO "player_profiles" ("user_id")
SELECT "id" FROM "users" WHERE "role" = 'player'
ON CONFLICT ("user_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "gym_owner_profiles" ("user_id")
SELECT "id" FROM "users" WHERE "role" = 'gym_owner'
ON CONFLICT ("user_id") DO NOTHING;
--> statement-breakpoint
UPDATE "users"
SET "onboarding_completed_at" = NOW()
WHERE "onboarding_completed_at" IS NULL;
