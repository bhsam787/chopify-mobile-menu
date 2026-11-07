-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'STARTER';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "cancelAtEndOfCycle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planCheckedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
