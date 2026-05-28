import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isTeacherAuthenticated } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isTeacherAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { id } = await params;

  // 读取可选的自定义 prompt
  let customPrompt: string | null = null;
  try {
    const body = await request.json();
    if (typeof body.prompt === "string" && body.prompt.trim()) {
      customPrompt = body.prompt.trim();
    }
  } catch {
    // body 为空或非 JSON 时忽略，使用默认 prompt
  }

  // 验证问题存在
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id")
    .eq("id", id)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: "问题不存在" }, { status: 404 });
  }

  // 写入分析任务，立即返回（由 Python Worker 异步处理）
  const { data, error } = await supabase
    .from("analyses")
    .insert({ question_id: id, status: "pending", prompt: customPrompt })
    .select("id, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ analysis: data }, { status: 201 });
}
