CREATE TYPE "public"."playback_request_action" AS ENUM('play', 'pause', 'seek', 'change_video');--> statement-breakpoint
CREATE TYPE "public"."playback_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "playback_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"action" "playback_request_action" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "playback_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "playback_requests" ADD CONSTRAINT "playback_requests_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_requests" ADD CONSTRAINT "playback_requests_requester_id_participants_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_requests" ADD CONSTRAINT "playback_requests_reviewed_by_participants_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;