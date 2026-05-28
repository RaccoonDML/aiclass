import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isTeacherAuthenticated } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isTeacherAuthenticated();
  if (!authed) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { id } = await params;

  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !question) {
    return NextResponse.json({ error: "问题不存在" }, { status: 404 });
  }

  if (question.status === "active") {
    return NextResponse.json({ error: "该问题已经是进行中状态" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // 先关闭其他所有 active 问题
  await supabase
    .from("questions")
    .update({ status: "closed", closed_at: now })
    .eq("status", "active");

  // 重新激活本问题
  const { data, error } = await supabase
    .from("questions")
    .update({ status: "active", closed_at: null, published_at: now })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
