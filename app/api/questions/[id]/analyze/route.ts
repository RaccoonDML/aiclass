import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isTeacherAuthenticated } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isTeacherAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { id } = await params;

  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single();

  if (questionError || !question) {
    return NextResponse.json({ error: "问题不存在" }, { status: 404 });
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("id, raw_text, created_at")
    .eq("question_id", id)
    .order("created_at", { ascending: true });

  if (submissionsError) {
    return NextResponse.json(
      { error: submissionsError.message },
      { status: 500 }
    );
  }

  const aiBackendUrl = process.env.AI_BACKEND_URL;

  if (!aiBackendUrl) {
    return NextResponse.json(
      {
        error: "AI 分析服务暂未配置，请在环境变量中设置 AI_BACKEND_URL",
        question,
        submissions_count: submissions?.length ?? 0,
      },
      { status: 503 }
    );
  }

  try {
    const payload = {
      question: {
        id: question.id,
        content: question.content,
        status: question.status,
        published_at: question.published_at,
        closed_at: question.closed_at,
      },
      submissions: submissions?.map((s) => ({
        id: s.id,
        raw_text: s.raw_text,
        created_at: s.created_at,
      })),
    };

    const aiResponse = await fetch(aiBackendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return NextResponse.json(
        { error: `AI 服务返回错误：${errText}` },
        { status: 502 }
      );
    }

    const result = await aiResponse.json();
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: `连接 AI 服务失败：${err instanceof Error ? err.message : "未知错误"}` },
      { status: 502 }
    );
  }
}
