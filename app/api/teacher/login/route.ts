import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthCookieConfig } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "请输入密码" }, { status: 400 });
    }

    const teacherPassword = process.env.TEACHER_PASSWORD;
    if (!teacherPassword) {
      return NextResponse.json(
        { error: "服务器未配置教师密码" },
        { status: 500 }
      );
    }

    if (password !== teacherPassword) {
      return NextResponse.json({ error: "教师密码不正确" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const config = getAuthCookieConfig();
    cookieStore.set(config.name, config.value, {
      httpOnly: config.httpOnly,
      secure: config.secure,
      sameSite: config.sameSite,
      path: config.path,
      maxAge: config.maxAge,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
