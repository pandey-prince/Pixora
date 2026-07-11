-- AlterTable: end-to-end encryption key material on User
ALTER TABLE "User" ADD COLUMN "encryptedMasterKey" TEXT;
ALTER TABLE "User" ADD COLUMN "masterKeySalt" TEXT;
ALTER TABLE "User" ADD COLUMN "masterKeyIv" TEXT;
ALTER TABLE "User" ADD COLUMN "kdf" TEXT;
ALTER TABLE "User" ADD COLUMN "recoveryWrappedKey" TEXT;
ALTER TABLE "User" ADD COLUMN "recoverySalt" TEXT;
ALTER TABLE "User" ADD COLUMN "recoveryIv" TEXT;

-- AlterTable: per-photo encryption metadata.
-- Existing rows are legacy plaintext photos, so default `encrypted` to false for them
-- and let new rows default to true at the application layer.
ALTER TABLE "Photo" ADD COLUMN "encrypted" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Photo" ADD COLUMN "encryptedKey" TEXT;
ALTER TABLE "Photo" ADD COLUMN "keyIv" TEXT;
ALTER TABLE "Photo" ADD COLUMN "contentIv" TEXT;
ALTER TABLE "Photo" ADD COLUMN "encryptedFileName" TEXT;
ALTER TABLE "Photo" ADD COLUMN "fileNameIv" TEXT;
ALTER TABLE "Photo" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Photo" ADD COLUMN "thumbUrl" TEXT;
ALTER TABLE "Photo" ADD COLUMN "thumbPublicId" TEXT;
ALTER TABLE "Photo" ADD COLUMN "thumbIv" TEXT;

-- Any rows that already exist predate encryption; mark them as plaintext.
UPDATE "Photo" SET "encrypted" = false WHERE "encryptedKey" IS NULL;
