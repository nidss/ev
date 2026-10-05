import { z } from "zod";

export const checkinBody = z.object({
  id: z.uuid(),
  code: z.string().min(1).max(500),
  checkpointId: z.string().min(1),
  operatingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryCheckConfirmed: z.boolean().nullish(),
  deviceName: z.string().max(60).default(""),
  scannedAt: z.iso.datetime().optional(),
});
