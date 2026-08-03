CREATE TYPE "public"."user_role" AS ENUM('gym_owner', 'player');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
-- The column used to be free-form text defaulting to 'user' (and 'member' in
-- the first migration). Neither is part of the closed vocabulary, so anyone
-- predating the enum becomes a player. Drop the default first: Postgres will
-- not cast an existing text default to the enum type on its own.
UPDATE "users" SET "role" = 'player' WHERE "role" <> 'gym_owner';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'player';
