import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getClearCookieConfig } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const config = getClearCookieConfig();
  cookieStore.set(config.name, config.value, {
    httpOnly: config.httpOnly,
    secure: config.secure,
    sameSite: config.sameSite,
    path: config.path,
    maxAge: config.maxAge,
  });

  return NextResponse.json({ ok: true });
}
