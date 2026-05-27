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

  // 返回该问题最新一条分析记录
  const { data, error } = await supabase
    .from("analyses")
    .select("id, status, result, error_msg, created_at, completed_at")
    .eq("question_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({ analysis: data });
}
