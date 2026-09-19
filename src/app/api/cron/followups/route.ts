import { NextRequest, NextResponse } from "next/server";
import { processDueFollowups } from "@/lib/crm/followups";

/**
 * Trigger for the follow-up automation queue (spec section 23). Wire this
 * up to Vercel Cron (vercel.json) or an n8n/Make scheduled scenario hitting
 * this URL every few minutes. Protected by CRON_SECRET: set it as a Vercel
 * env var and Vercel Cron will automatically send it as
 * `Authorization: Bearer <CRON_SECRET>`. For n8n/Make, add that same header
 * manually to the HTTP request module.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("authorization");
    if (provided !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const result = await processDueFollowups();
  return NextResponse.json(result);
}
