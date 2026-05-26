import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保护 /teacher 路由（登录页除外）
  if (pathname.startsWith("/teacher") && pathname !== "/teacher/login") {
    const authCookie = request.cookies.get("teacher_auth");
    if (authCookie?.value !== "1") {
      return NextResponse.redirect(new URL("/teacher/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*"],
};
