-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('TERMS', 'PRIVACY');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('COLLECTING', 'READY', 'CONFIRMED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('MEAL', 'CAFE', 'DRINK', 'STUDY', 'MEETING', 'EXERCISE', 'GAME', 'PARTY', 'ETC');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'MEMBER');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('JOINED', 'SUBMITTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ClosedFromStatus" AS ENUM ('COLLECTING', 'READY', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ClosedTrigger" AS ENUM ('MANUAL', 'EXPIRED', 'REACHED');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "nickname" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "policy_versions" (
    "policy_version_id" BIGSERIAL NOT NULL,
    "policy_type" "PolicyType" NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "is_latest" BOOLEAN NOT NULL DEFAULT false,
    "effective_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("policy_version_id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "consent_id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "terms_version_id" BIGINT NOT NULL,
    "privacy_version_id" BIGINT NOT NULL,
    "agreed_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("consent_id")
);

-- CreateTable
CREATE TABLE "time_options" (
    "time_option_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "start_at" TIMESTAMP(6) NOT NULL,
    "end_at" TIMESTAMP(6) NOT NULL,
    "available_count" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "time_options_pkey" PRIMARY KEY ("time_option_id")
);

-- CreateTable
CREATE TABLE "place_options" (
    "place_option_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "place_name" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "average_distance" INTEGER,
    "total_distance" INTEGER,
    "score" INTEGER,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "place_options_pkey" PRIMARY KEY ("place_option_id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "meeting_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "time_option_id" BIGINT NOT NULL,
    "place_option_id" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("meeting_id")
);

-- CreateTable
CREATE TABLE "closures" (
    "closure_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "closed_from_status" "ClosedFromStatus" NOT NULL,
    "closed_trigger" "ClosedTrigger" NOT NULL,
    "closed_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "closures_pkey" PRIMARY KEY ("closure_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "room_id" BIGSERIAL NOT NULL,
    "host_id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "status" "RoomStatus" NOT NULL DEFAULT 'COLLECTING',
    "category" "RoomCategory" NOT NULL DEFAULT 'MEAL',
    "date_start" DATE NOT NULL,
    "date_end" DATE NOT NULL,
    "available_days" JSONB NOT NULL,
    "time_start" TIME(6) NOT NULL,
    "time_end" TIME(6) NOT NULL,
    "deadline_at" TIMESTAMP(6) NOT NULL,
    "collect_origin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "participants" (
    "participant_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "user_id" UUID,
    "participant_uuid" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "nickname" VARCHAR(50) NOT NULL,
    "decision_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("participant_id")
);

-- CreateTable
CREATE TABLE "origins" (
    "origin_id" BIGSERIAL NOT NULL,
    "participant_id" BIGINT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "place_name" VARCHAR(100),

    CONSTRAINT "origins_pkey" PRIMARY KEY ("origin_id")
);

-- CreateTable
CREATE TABLE "blocked_slots" (
    "blocked_slot_id" BIGSERIAL NOT NULL,
    "participant_id" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("blocked_slot_id")
);

-- CreateIndex
CREATE INDEX "policy_versions_policy_type_is_latest_idx" ON "policy_versions"("policy_type", "is_latest");

-- CreateIndex
CREATE UNIQUE INDEX "policy_versions_policy_type_version_key" ON "policy_versions"("policy_type", "version");

-- CreateIndex
CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_options_room_id_rank_key" ON "time_options"("room_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "place_options_room_id_rank_key" ON "place_options"("room_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_room_id_key" ON "meetings"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "closures_room_id_key" ON "closures"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_slug_key" ON "rooms"("slug");

-- CreateIndex
CREATE INDEX "rooms_host_id_idx" ON "rooms"("host_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_participant_uuid_key" ON "participants"("participant_uuid");

-- CreateIndex
CREATE INDEX "participants_room_id_idx" ON "participants"("room_id");

-- CreateIndex
CREATE INDEX "participants_user_id_idx" ON "participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "origins_participant_id_key" ON "origins"("participant_id");

-- CreateIndex
CREATE INDEX "blocked_slots_participant_id_date_idx" ON "blocked_slots"("participant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_slots_participant_id_date_slot_index_key" ON "blocked_slots"("participant_id", "date", "slot_index");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_terms_version_id_fkey" FOREIGN KEY ("terms_version_id") REFERENCES "policy_versions"("policy_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_privacy_version_id_fkey" FOREIGN KEY ("privacy_version_id") REFERENCES "policy_versions"("policy_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_options" ADD CONSTRAINT "time_options_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_options" ADD CONSTRAINT "place_options_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_time_option_id_fkey" FOREIGN KEY ("time_option_id") REFERENCES "time_options"("time_option_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_place_option_id_fkey" FOREIGN KEY ("place_option_id") REFERENCES "place_options"("place_option_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closures" ADD CONSTRAINT "closures_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "origins" ADD CONSTRAINT "origins_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("participant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("participant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
