"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { type Question, type Submission } from "@/lib/supabase";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── 发布问题表单 ───────────────────────────────────────────
function PublishForm({ onPublished }: { onPublished: (q: Question) => void }) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || status === "loading") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "发布失败");
        setStatus("error");
        return;
      }

      setContent("");
      setStatus("success");
      onPublished(data.question);
      textareaRef.current?.focus();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setErrorMsg("网络错误，请重试");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div
      className="rounded-2xl border-2 p-6"
      style={{
        borderColor: "rgba(30,58,95,0.2)",
        background: "var(--color-teacher-bg)",
      }}
    >
      <h2
        className="text-base font-bold mb-4 flex items-center gap-2"
        style={{ color: "var(--color-teacher)" }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        发布新问题
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="输入课堂问题内容……（发布后，当前正在进行的问题将自动关闭）"
          rows={3}
          className="w-full rounded-xl border-2 p-3 text-base resize-none outline-none transition-all duration-200"
          style={{
            borderColor: status === "error" ? "var(--color-danger)" : "rgba(30,58,95,0.2)",
            background: "var(--color-surface)",
            fontFamily: "var(--font-display)",
            color: "var(--color-text-primary)",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--color-teacher)";
            e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = status === "error" ? "var(--color-danger)" : "rgba(30,58,95,0.2)";
            e.target.style.boxShadow = "none";
          }}
        />

        {status === "error" && (
          <p className="text-sm font-medium animate-fade-in" style={{ color: "var(--color-danger)" }}>
            {errorMsg}
          </p>
        )}

        {status === "success" && (
          <p className="text-sm font-medium animate-fade-in" style={{ color: "var(--color-active)" }}>
            ✓ 问题已发布，旧问题已自动关闭
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!content.trim() || status === "loading"}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--color-teacher)" }}
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                发布中…
              </span>
            ) : (
              "发布问题"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── 问题详情抽屉 ───────────────────────────────────────────
function QuestionDetail({
  question,
  onClose,
  onClosed,
}: {
  question: Question;
  onClose: () => void;
  onClosed: (q: Question) => void;
}) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [closeStatus, setCloseStatus] = useState<"idle" | "loading" | "done">("idle");
  // submitting: 正在提交任务到 DB；polling: 等待 Worker 处理；done/error: 完成
  const [analyzeStatus, setAnalyzeStatus] = useState<"idle" | "submitting" | "polling" | "done" | "error">("idle");
  const [analyzeResult, setAnalyzeResult] = useState<string>("");
  const [analyzeError, setAnalyzeError] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState(question.status);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/questions/${question.id}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions ?? []);
      }
    } finally {
      setLoadingSubmissions(false);
    }
  }

  // 轮询回答（仅 active 状态）
  useEffect(() => {
    if (currentStatus !== "active") return;
    const timer = setInterval(loadSubmissions, 5000);
    return () => clearInterval(timer);
  }, [currentStatus, question.id]);

  // 轮询 AI 分析结果（polling 状态时每 3 秒查询一次）
  useEffect(() => {
    if (analyzeStatus !== "polling") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/questions/${question.id}/analysis`);
        if (!res.ok) return;
        const data = await res.json();
        const analysis = data.analysis;
        if (!analysis) return;

        if (analysis.status === "done") {
          setAnalyzeResult(analysis.result ?? "");
          setAnalyzeStatus("done");
        } else if (analysis.status === "error") {
          setAnalyzeError(analysis.error_msg ?? "AI 分析失败");
          setAnalyzeStatus("error");
        }
        // pending / processing 继续等待
      } catch {
        // 网络抖动时静默忽略，继续轮询
      }
    };

    poll(); // 立即查一次
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [analyzeStatus, question.id]);

  async function handleClose() {
    if (closeStatus === "loading") return;
    if (!confirm("确认结束该问题？结束后学生将无法继续提交回答。")) return;

    setCloseStatus("loading");
    try {
      const res = await fetch(`/api/questions/${question.id}/close`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCurrentStatus("closed");
        setCloseStatus("done");
        onClosed(data.question);
      }
    } catch {
      setCloseStatus("idle");
    }
  }

  async function handleAnalyze() {
    if (analyzeStatus === "submitting" || analyzeStatus === "polling") return;
    setAnalyzeStatus("submitting");
    setAnalyzeResult("");
    setAnalyzeError("");

    try {
      const res = await fetch(`/api/questions/${question.id}/analyze`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setAnalyzeError(data.error ?? "提交分析任务失败");
        setAnalyzeStatus("error");
        return;
      }

      // 任务已写入 DB，切换到轮询状态
      setAnalyzeStatus("polling");
    } catch {
      setAnalyzeError("网络错误，无法提交分析任务");
      setAnalyzeStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="ml-auto w-full max-w-xl h-full overflow-y-auto flex flex-col animate-slide-in"
        style={{
          background: "var(--color-surface)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.12)",
        }}
      >
        {/* 抽屉头部 */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--color-teacher)" }}>
            问题详情
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {/* 问题信息 */}
          <div
            className={`rounded-xl border-2 p-4 ${
              currentStatus === "active"
                ? "border-green-200 bg-green-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              {currentStatus === "active" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />
                  正在收集答案
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  已结束
                </span>
              )}
            </div>
            <p
              className="text-lg font-semibold leading-relaxed text-gray-900 mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {question.content}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <div>
                <span className="font-medium">发布时间：</span>
                {formatFullTime(question.published_at)}
              </div>
              {question.closed_at && (
                <div>
                  <span className="font-medium">结束时间：</span>
                  {formatFullTime(question.closed_at)}
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {currentStatus === "active" && (
              <button
                onClick={handleClose}
                disabled={closeStatus === "loading" || closeStatus === "done"}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 disabled:opacity-50"
                style={{
                  borderColor: "var(--color-danger)",
                  color: "var(--color-danger)",
                  background: "var(--color-danger-bg)",
                }}
              >
                {closeStatus === "loading" ? "结束中…" : closeStatus === "done" ? "✓ 已结束" : "结束问题"}
              </button>
            )}
            <button
              onClick={handleAnalyze}
              disabled={analyzeStatus === "submitting" || analyzeStatus === "polling"}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
              style={{ background: "var(--color-teacher-accent)" }}
            >
              {analyzeStatus === "submitting" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  提交中…
                </span>
              ) : analyzeStatus === "polling" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI 分析中…
                </span>
              ) : (
                "✨ AI 分析"
              )}
            </button>
          </div>

          {/* AI 分析状态提示 */}
          {analyzeStatus === "polling" && (
            <div
              className="flex items-center gap-3 p-4 rounded-xl border-2 animate-fade-in"
              style={{
                borderColor: "rgba(200,151,42,0.25)",
                background: "rgba(200,151,42,0.04)",
              }}
            >
              <svg className="w-5 h-5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: "var(--color-teacher-accent)" }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-teacher-accent)" }}>
                  分析任务已提交，等待 Worker 处理…
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  每 3 秒自动刷新，请稍候
                </p>
              </div>
            </div>
          )}

          {/* AI 分析结果 */}
          {analyzeStatus === "done" && analyzeResult && (
            <div
              className="rounded-xl border-2 p-4 animate-fade-in"
              style={{
                borderColor: "rgba(200,151,42,0.3)",
                background: "rgba(200,151,42,0.05)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: "var(--color-teacher-accent)" }}>
                  ✨ AI 分析结果
                </h3>
                <button
                  onClick={() => { setAnalyzeResult(""); setAnalyzeStatus("idle"); }}
                  className="text-xs transition-opacity hover:opacity-60"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  重新分析
                </button>
              </div>
              <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-body)" }}>
                {analyzeResult}
              </pre>
            </div>
          )}

          {analyzeStatus === "error" && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-red-700">{analyzeError}</p>
                <button
                  onClick={() => setAnalyzeStatus("idle")}
                  className="text-xs text-red-500 hover:opacity-70 transition-opacity ml-4 flex-shrink-0"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 回答列表 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
                收到的回答
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: submissions.length > 0 ? "var(--color-active-bg)" : "var(--color-closed-bg)",
                  color: submissions.length > 0 ? "var(--color-active)" : "var(--color-closed)",
                  border: `1px solid ${submissions.length > 0 ? "var(--color-active-border)" : "var(--color-closed-border)"}`,
                }}
              >
                {submissions.length} 条
              </span>
              {currentStatus === "active" && (
                <button
                  onClick={loadSubmissions}
                  className="ml-auto text-xs font-medium transition-colors hover:opacity-70"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  刷新
                </button>
              )}
            </div>

            {loadingSubmissions ? (
              <div className="text-center py-8">
                <svg className="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24" style={{ color: "var(--color-text-muted)" }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>加载中…</p>
              </div>
            ) : submissions.length === 0 ? (
              <div
                className="text-center py-10 rounded-xl border-2 border-dashed"
                style={{ borderColor: "var(--color-border)" }}
              >
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  暂无回答
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((s, i) => (
                  <div
                    key={s.id}
                    className="rounded-xl border p-4 animate-fade-in"
                    style={{
                      borderColor: "var(--color-border)",
                      background: "var(--color-surface)",
                      animationDelay: `${Math.min(i * 50, 500)}ms`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--color-teacher-bg)",
                          color: "var(--color-teacher)",
                        }}
                      >
                        #{i + 1}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatTime(s.created_at)}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {s.raw_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主控制台 ───────────────────────────────────────────────
export default function TeacherConsole({ initialQuestions }: { initialQuestions: Question[] }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  function handlePublished(newQuestion: Question) {
    setQuestions((prev) =>
      [newQuestion, ...prev.map((q) =>
        q.status === "active" ? { ...q, status: "closed" as const, closed_at: new Date().toISOString() } : q
      )]
    );
  }

  function handleClosed(updatedQuestion: Question) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/teacher/logout", { method: "POST" });
      router.push("/teacher/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const activeQuestion = questions.find((q) => q.status === "active");

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* 顶栏 */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          background: "rgba(250,249,247,0.95)",
          backdropFilter: "blur(8px)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-teacher)" }}
            >
              AI Class
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              教师控制台
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 disabled:opacity-50"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {loggingOut ? "退出中…" : "退出"}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* 发布新问题 */}
        <PublishForm onPublished={handlePublished} />

        {/* 当前 active 问题提示 */}
        {activeQuestion && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all duration-200"
            style={{
              borderColor: "var(--color-active-border)",
              background: "var(--color-active-bg)",
            }}
            onClick={() => setSelectedQuestion(activeQuestion)}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot mt-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700 mb-1">当前正在进行的问题</p>
              <p
                className="text-base font-medium text-green-900 truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {activeQuestion.content}
              </p>
            </div>
            <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}

        {/* 历史问题列表 */}
        <div>
          <h2
            className="text-sm font-bold mb-4"
            style={{ color: "var(--color-text-secondary)" }}
          >
            所有问题（共 {questions.length} 个）
          </h2>

          {questions.length === 0 ? (
            <div
              className="text-center py-12 rounded-2xl border-2 border-dashed"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="text-base" style={{ color: "var(--color-text-muted)" }}>
                还没有发布过问题
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestion(q)}
                  className="group rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-md"
                  style={{
                    borderColor: q.status === "active" ? "var(--color-active-border)" : "var(--color-border)",
                    background: q.status === "active" ? "var(--color-active-bg)" : "var(--color-surface)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {q.status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-dot" />
                            进行中
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
                            已结束
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {formatTime(q.published_at)}
                        </span>
                      </div>
                      <p
                        className="text-sm font-medium leading-relaxed"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: q.status === "active" ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        }}
                      >
                        {q.content}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-70 transition-opacity"
                      style={{ color: "var(--color-text-secondary)" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 问题详情抽屉 */}
      {selectedQuestion && (
        <QuestionDetail
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          onClosed={(updated) => {
            handleClosed(updated);
            setSelectedQuestion(updated);
          }}
        />
      )}
    </div>
  );
}
