import { errorResponse, readJson } from "@/lib/api";
import { ready } from "@/lib/server";

// export lead เป็น CSV — ทุกครั้งถูกบันทึกเป็นหลักฐานการแชร์ข้อมูล (POST เพราะมีผลข้างเคียง)
export async function POST(req: Request, ctx: { params: Promise<{ sponsorId: string }> }) {
  try {
    const { sponsorId } = await ctx.params;
    const body = (await readJson(req)) as { by?: unknown } | null;
    const by = typeof body?.by === "string" ? body.by : "";
    const { onsite } = await ready();
    const { csv, record } = onsite.exportLeads(sponsorId, by);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="leads-${sponsorId}-${record.createdAt.slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
