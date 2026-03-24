ALTER TABLE "trainers"
ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "trainers_userId_key" ON "trainers"("userId");

ALTER TABLE "trainers"
ADD CONSTRAINT "trainers_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;