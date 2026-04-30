-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('COLLECTING', 'READY', 'CONFIRMED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('MEAL', 'CAFE', 'DRINK', 'STUDY', 'MEETING', 'EXERCISE', 'GAME', 'PARTY', 'ETC');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'MEMBER');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('JOINED', 'SUBMITTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ClosureFromStatus" AS ENUM ('COLLECTING', 'READY', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ClosureTrigger" AS ENUM ('MANUAL', 'EXPIRED', 'REACHED');

-- CreateTable
CREATE TABLE "users" (
    "user_id" BIGSERIAL NOT NULL,
    "nickname" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "auth" (
    "auth_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "kakao_user_id" VARCHAR(100) NOT NULL,
    "refresh_token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_pkey" PRIMARY KEY ("auth_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "room_id" BIGSERIAL NOT NULL,
    "owner_id" BIGINT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "status" "RoomStatus" NOT NULL DEFAULT 'COLLECTING',
    "category" "RoomCategory" NOT NULL DEFAULT 'MEAL',
    "date_start" DATE NOT NULL,
    "date_end" DATE NOT NULL,
    "available_days" INTEGER[],
    "time_start" TIME(0) NOT NULL,
    "time_end" TIME(0) NOT NULL,
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "collect_origin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "participants" (
    "participant_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "status" "ParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "nickname" VARCHAR(50) NOT NULL,
    "decision_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("blocked_slot_id")
);

-- CreateTable
CREATE TABLE "time_options" (
    "time_option_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
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
    "average_distance" INTEGER NOT NULL,
    "total_distance" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "place_options_pkey" PRIMARY KEY ("place_option_id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "meeting_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "time_option_id" BIGINT NOT NULL,
    "place_option_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("meeting_id")
);

-- CreateTable
CREATE TABLE "closures" (
    "closure_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "closed_from_status" "ClosureFromStatus" NOT NULL,
    "close_trigger" "ClosureTrigger" NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "closures_pkey" PRIMARY KEY ("closure_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_id_key" ON "auth"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_kakao_user_id_key" ON "auth"("kakao_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_slug_key" ON "rooms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "origins_participant_id_key" ON "origins"("participant_id");

-- CreateIndex
CREATE INDEX "blocked_slots_participant_id_idx" ON "blocked_slots"("participant_id");

-- CreateIndex
CREATE INDEX "blocked_slots_date_idx" ON "blocked_slots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_slots_participant_id_date_slot_index_key" ON "blocked_slots"("participant_id", "date", "slot_index");

-- CreateIndex
CREATE UNIQUE INDEX "time_options_room_id_rank_key" ON "time_options"("room_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "place_options_room_id_rank_key" ON "place_options"("room_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_room_id_key" ON "meetings"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "closures_room_id_key" ON "closures"("room_id");

-- AddForeignKey
ALTER TABLE "auth" ADD CONSTRAINT "auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "origins" ADD CONSTRAINT "origins_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("participant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("participant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
