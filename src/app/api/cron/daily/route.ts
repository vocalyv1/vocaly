import { NextResponse, type NextRequest } from "next/server";
import { runDaily } from "@/lib/notify/daily";
import { siteUrl } from "@/lib/site";

export const maxDuration = 60;

// Appelée chaque jour par Vercel Cron (vercel.json). Vercel envoie « Authorization: Bearer <CRON_SECRET> ».
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse(null, { status: 401 });
  const result = await runDaily(await siteUrl());
  return NextResponse.json(result);
}
