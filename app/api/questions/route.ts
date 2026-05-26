import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isTeacherAuthenticated } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authed = await isTeacherAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "问题内容不能为空" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 关闭所有当前 active 问题
    const { error: closeError } = await supabase
      .from("questions")
      .update({ status: "closed", closed_at: now })
      .eq("status", "active");

    if (closeError) {
      return NextResponse.json({ error: closeError.message }, { status: 500 });
    }

    // 创建新问题
    const { data, error } = await supabase
      .from("questions")
      .insert({
        content: content.trim(),
        status: "active",
        published_at: now,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
