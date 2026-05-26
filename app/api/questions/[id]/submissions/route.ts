import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isTeacherAuthenticated } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isTeacherAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("submissions")
    .select("id, question_id, raw_text, created_at")
    .eq("question_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 检查问题是否存在
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, status")
    .eq("id", id)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: "问题不存在" }, { status: 404 });
  }

  if (question.status !== "active") {
    return NextResponse.json(
      { error: "该问题已结束，不接受新回答" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { raw_text, client_session_id } = body;

    if (!raw_text || typeof raw_text !== "string" || raw_text.trim() === "") {
      return NextResponse.json({ error: "回答内容不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        question_id: id,
        raw_text: raw_text.trim(),
        client_session_id: client_session_id ?? null,
      })
      .select("id, question_id, raw_text, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submission: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
