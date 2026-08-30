CREATE TYPE "public"."user_role" AS ENUM('gym_owner', 'player');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
UPDATE "users" SET "role" = 'player' WHERE "role" <> 'gym_owner';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'player'::"public"."user_role";
