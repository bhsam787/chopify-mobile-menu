import { PrismaClient } from "@prisma/client";

declare global {
  // Reused across dev-server reloads so we don't exhaust database connections.
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const prisma = global.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
