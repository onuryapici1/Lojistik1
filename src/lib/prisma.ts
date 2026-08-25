import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma istemcisi.
 *
 * İki noktaya dikkat:
 *
 * 1) Bağlantı **tembel** kuruluyor. Modül yüklenir yüklenmez DATABASE_URL
 *    arasaydık, ortam değişkeni olmayan bir ortamda (örneğin `next build`
 *    sayfa verisi toplarken) derleme patlardı. Bu yüzden istemci ilk gerçek
 *    sorguda yaratılıyor.
 *
 * 2) İstemci globalThis üzerinde saklanıyor; geliştirme sırasında her sıcak
 *    yeniden yüklemede yeni havuz açılmasın diye.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function olustur(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL tanımlı değil. Vercel > Settings > Environment Variables'a ekleyin.",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  const istemci = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = istemci;
  }
  return istemci;
}

let onbellek: PrismaClient | undefined;

function istemciAl(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  onbellek ??= olustur();
  return onbellek;
}

/**
 * Gerçek istemciye erişimi ilk kullanıma kadar erteleyen vekil.
 * `prisma.order.findMany()` çağrıldığı anda bağlantı kurulur.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_hedef, ozellik, alici) {
    const istemci = istemciAl();
    const deger = Reflect.get(istemci as object, ozellik, alici);
    return typeof deger === "function" ? deger.bind(istemci) : deger;
  },
});
