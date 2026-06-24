import { PrismaClient } from "@prisma/client";

const globalPrisma = new PrismaClient();

function cleanR2Url(url: string | null | undefined): string | null {
  if (!url) return null;
  // Replace the blocked R2 subdomain with our server-side media proxy
  return url.replace(/https:\/\/pub-[a-zA-Z0-9]+\.r2\.dev/gi, "https://saadstudio.app/api/media");
}

function cleanR2UrlArray(arr: any): any {
  if (Array.isArray(arr)) {
    return arr.map(item => typeof item === "string" ? cleanR2Url(item) : item);
  }
  return arr;
}

const prismadb = globalPrisma.$extends({
  result: {
    generation: {
      mediaUrl: {
        needs: { mediaUrl: true },
        compute(data) {
          return cleanR2Url(data.mediaUrl);
        },
      },
      outputUrl: {
        needs: { outputUrl: true },
        compute(data) {
          return cleanR2Url(data.outputUrl);
        },
      },
    },
    userCharacter: {
      coverUrl: {
        needs: { coverUrl: true },
        compute(data) {
          return cleanR2Url(data.coverUrl);
        },
      },
      referenceUrls: {
        needs: { referenceUrls: true },
        compute(data) {
          return cleanR2UrlArray(data.referenceUrls);
        },
      },
    },
    transitionOutput: {
      inputAUrl: {
        needs: { inputAUrl: true },
        compute(data) {
          return cleanR2Url(data.inputAUrl);
        },
      },
      inputBUrl: {
        needs: { inputBUrl: true },
        compute(data) {
          return cleanR2Url(data.inputBUrl);
        },
      },
    },
    transitionProject: {
      inputAUrl: {
        needs: { inputAUrl: true },
        compute(data) {
          return cleanR2Url(data.inputAUrl);
        },
      },
      inputBUrl: {
        needs: { inputBUrl: true },
        compute(data) {
          return cleanR2Url(data.inputBUrl);
        },
      },
    },
  },
});

declare global {
  // eslint-disable-next-line no-var
  var prisma: typeof prismadb | undefined;
}

// Use a single global PrismaClient instance in development to avoid
// exhausting database connections during hot reloads.
const activePrisma = globalThis.prisma || prismadb;

if (process.env.NODE_ENV !== "production") globalThis.prisma = activePrisma;

export default activePrisma;

