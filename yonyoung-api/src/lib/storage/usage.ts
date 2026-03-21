import { createR2Client } from "../../infra/r2/client";

export const R2_STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

export const readR2TotalUsageBytes = async (r2?: R2Bucket): Promise<number> => {
  if (!r2) {
    throw new Error("R2 bucket binding is not configured.");
  }

  const client = createR2Client(r2);
  let totalUsageBytes = 0;
  let cursor: string | undefined = undefined;

  while (true) {
    const listed = await client.listObjects(cursor ? { cursor } : {});
    for (const object of listed.objects) {
      totalUsageBytes += object.size;
    }

    if (!listed.truncated) {
      break;
    }

    cursor = listed.cursor;
  }

  return totalUsageBytes;
};
