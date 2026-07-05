-- CreateEnum
CREATE TYPE "EmailPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "priority" "EmailPriority" NOT NULL DEFAULT 'MEDIUM';
