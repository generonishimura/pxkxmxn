-- AlterEnum
-- schema.prisma には Confusion があるが、足すマイグレーションがなかったので足す
ALTER TYPE "StatusCondition" ADD VALUE IF NOT EXISTS 'Confusion';
