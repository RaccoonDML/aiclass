"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || status === "loading") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "登录失败");
        setStatus("error");
        return;
      }

      router.push("/teacher");
      router.refresh();
    } catch {
      setErrorMsg("网络错误，请重试");
      setStatus("error");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--color-bg)" }}
    >
      {/* 装饰性背景元素 */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-5"
          style={{ background: "var(--color-teacher)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-5"
          style={{ background: "var(--color-teacher-accent)" }}
        />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo 区域 */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
            style={{ background: "var(--color-teacher)" }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-teacher)" }}
          >
            AI Class
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            教师控制台
          </p>
        </div>

        {/* 登录卡片 */}
        <div
          className="rounded-2xl p-8 shadow-xl border"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "0 20px 60px rgba(30,58,95,0.08), 0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: "var(--color-text-primary)" }}
          >
            请输入教师密码
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="••••••••"
                className="w-full rounded-xl border-2 px-4 py-3.5 text-lg tracking-widest outline-none transition-all duration-200"
                style={{
                  borderColor: status === "error" ? "var(--color-danger)" : "var(--color-border)",
                  background: status === "error" ? "var(--color-danger-bg)" : "var(--color-surface)",
                  color: "var(--color-text-primary)",
                }}
                onFocus={(e) => {
                  if (status !== "error") {
                    e.target.style.borderColor = "var(--color-teacher)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(30,58,95,0.08)";
                  }
                }}
                onBlur={(e) => {
                  if (status !== "error") {
                    e.target.style.borderColor = "var(--color-border)";
                    e.target.style.boxShadow = "none";
                  }
                }}
                autoFocus
              />
            </div>

            {status === "error" && (
              <p className="text-sm font-medium animate-fade-in" style={{ color: "var(--color-danger)" }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={!password.trim() || status === "loading"}
              className="w-full py-3.5 rounded-xl text-base font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--color-teacher)",
              }}
            >
              {status === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  登录中…
                </span>
              ) : (
                "登录"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--color-text-muted)" }}>
          学生端无需登录，请直接访问首页
        </p>
      </div>
    </div>
  );
}
