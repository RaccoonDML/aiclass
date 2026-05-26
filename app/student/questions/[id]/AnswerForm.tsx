"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { type Question } from "@/lib/supabase";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOrCreateSessionId(): string {
  const key = "aiclass_session_id";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export default function AnswerForm({ question }: { question: Question }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitCount, setSubmitCount] = useState(0);
  const [questionStatus, setQuestionStatus] = useState(question.status);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 轮询问题状态，及时响应问题关闭
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/questions/${question.id}`);
        if (res.ok) {
          const data = await res.json();
          setQuestionStatus(data.question.status);
        }
      } catch {
        // 静默失败
      }
    };

    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, [question.id]);

  const isActive = questionStatus === "active";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || status === "submitting") return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const sessionId = getOrCreateSessionId();
      const res = await fetch(`/api/questions/${question.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: text.trim(), client_session_id: sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "提交失败，请重试");
        setStatus("error");

        if (res.status === 403) {
          setQuestionStatus("closed");
        }
        return;
      }

      setStatus("success");
      setSubmitCount((c) => c + 1);
      setText("");
      textareaRef.current?.focus();

      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setErrorMsg("网络错误，请检查连接后重试");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* 顶栏 */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          background: "rgba(250,249,247,0.92)",
          backdropFilter: "blur(8px)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/student"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-gray-900"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
          >
            AI Class
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* 问题卡片 */}
        <div
          className={`rounded-2xl border-2 p-6 mb-8 ${
            isActive
              ? "border-green-300 bg-green-50"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />
                正在收集答案
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-sm font-medium border border-gray-200">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                已结束
              </span>
            )}
            <span className="text-xs ml-auto" style={{ color: "var(--color-text-muted)" }}>
              发布于 {formatTime(question.published_at)}
            </span>
          </div>
          <p
            className="text-2xl leading-relaxed font-semibold text-gray-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {question.content}
          </p>
        </div>

        {/* 回答区域 */}
        {isActive ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              >
                写下你的回答
                <span className="ml-2 font-normal text-xs" style={{ color: "var(--color-text-muted)" }}>
                  （请在回答中注明你的学号，例如：我的学号是 123，我的回答是……）
                </span>
              </label>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="在这里写下你的回答……"
                rows={5}
                className="w-full rounded-xl border-2 p-4 text-lg leading-relaxed resize-none transition-all duration-200 outline-none"
                style={{
                  borderColor: text.trim() ? "var(--color-active-border)" : "var(--color-border)",
                  background: "var(--color-surface)",
                  fontFamily: "var(--font-display)",
                  color: "var(--color-text-primary)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#16a34a";
                  e.target.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = text.trim() ? "var(--color-active-border)" : "var(--color-border)";
                  e.target.style.boxShadow = "none";
                }}
                disabled={status === "submitting"}
              />
            </div>

            {/* 提示信息 */}
            {status === "success" && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-green-800">提交成功！</p>
                  <p className="text-sm text-green-600">
                    已提交 {submitCount} 条回答。可以继续提交另一条回答。
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-700 font-medium">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!text.trim() || status === "submitting"}
              className="w-full py-4 rounded-xl text-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: text.trim() && status !== "submitting" ? "var(--color-active)" : "#9ca3af",
              }}
            >
              {status === "submitting" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  提交中…
                </span>
              ) : (
                "提交回答"
              )}
            </button>
          </form>
        ) : (
          <div
            className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-8 text-center"
          >
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-xl font-semibold text-gray-500">该问题已结束</p>
            <p className="text-sm text-gray-400 mt-2">不再接受新的回答</p>
            <Link
              href="/student"
              className="inline-block mt-6 px-6 py-3 rounded-xl bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 transition-colors"
            >
              返回公示板
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
