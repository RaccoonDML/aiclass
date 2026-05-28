import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isTeacherAuthenticated } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "问题不存在" }, { status: 404 });
  }

  return NextResponse.json({ question: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isTeacherAuthenticated();
  if (!authed) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { id } = await params;

  try {
    const { content } = await request.json();
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "问题内容不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("questions")
      .update({ content: content.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "问题不存在" }, { status: 404 });
    }

    return NextResponse.json({ question: data });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isTeacherAuthenticated();
  if (!authed) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { id } = await params;

  // 检查问题存在且已结束
  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !question) {
    return NextResponse.json({ error: "问题不存在" }, { status: 404 });
  }

  if (question.status === "active") {
    return NextResponse.json({ error: "正在进行的问题不能删除，请先结束" }, { status: 400 });
  }

  // 按依赖顺序删除：analyses → submissions → questions
  await supabase.from("analyses").delete().eq("question_id", id);
  await supabase.from("submissions").delete().eq("question_id", id);

  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
