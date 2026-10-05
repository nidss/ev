import "server-only";
import { NextResponse } from "next/server";
import { InvalidWebhookError, TicketingError } from "@ev/core";

const STATUS: Record<string, number> = {
  not_found: 404,
  forbidden: 403,
  invalid_input: 422,
  order_expired: 410,
};

// แปลง error ของ business logic เป็น JSON response — error อื่นปล่อยให้เป็น 500
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof TicketingError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details ?? null } },
      { status: STATUS[err.code] ?? 409 },
    );
  }
  if (err instanceof InvalidWebhookError) {
    return NextResponse.json({ error: { code: "invalid_signature", message: err.message } }, { status: 401 });
  }
  throw err;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
