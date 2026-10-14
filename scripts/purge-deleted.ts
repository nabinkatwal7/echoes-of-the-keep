import { purgeExpiredAccounts } from "@/lib/account/service";
import { prisma } from "@/lib/prisma";

/** Run daily (cron or a scheduled task): permanently removes accounts deleted more than 14 days ago. */
purgeExpiredAccounts()
  .then((n) => console.log(`Purged ${n} expired account${n === 1 ? "" : "s"}`))
  .finally(() => prisma.$disconnect());
