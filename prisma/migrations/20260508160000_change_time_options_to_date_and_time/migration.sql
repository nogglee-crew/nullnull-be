ALTER TABLE "time_options"
ADD COLUMN "date" DATE;

UPDATE "time_options"
SET
    "date" = (("start_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date,
    "start_at" = (("start_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'),
    "end_at" = (("end_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul');

ALTER TABLE "time_options"
ALTER COLUMN "start_at" TYPE TIME(6)
USING "start_at"::time,
ALTER COLUMN "end_at" TYPE TIME(6)
USING "end_at"::time,
ALTER COLUMN "date" SET NOT NULL;
