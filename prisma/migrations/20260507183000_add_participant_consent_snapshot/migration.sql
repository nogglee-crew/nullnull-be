ALTER TABLE "participants"
ADD COLUMN "terms_version_id" BIGINT,
ADD COLUMN "privacy_version_id" BIGINT,
ADD COLUMN "agreed_at" TIMESTAMP(6);

ALTER TABLE "participants"
ALTER COLUMN "participant_uuid" DROP NOT NULL;
