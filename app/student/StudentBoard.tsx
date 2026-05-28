"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Question } from "@/lib/supabase";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function QuestionCard({ question }: { question: Question }) {
  const isActive = question.status === "active";

  const card = (
    <div
      className={`
        relative rounded-2xl border-2 p-6 transition-all duration-200
        ${isActive
          ? "border-green-300 bg-green-50 hover:border-green-400 hover:shadow-lg hover:shadow-green-100 cursor-pointer"
          : "border-gray-200 bg-gray-50 cursor-default opacity-75"
        }
      `}
    >
      {/* 状态徽章 */}
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
        <span className="text-xs text-gray-400 ml-auto">
          {formatTime(question.published_at)}
        </span>
      </div>

      {/* 问题内容 */}
      <p
        className={`text-xl leading-relaxed font-medium ${
          isActive ? "text-gray-900" : "text-gray-500"
        }`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {question.content}
      </p>

      {isActive && (
        <div className="mt-4 flex items-center gap-1 text-green-600 text-sm font-medium">
          <span>点击进入回答</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (isActive) {
    return (
      <Link href={`/student/questions/${question.id}`} className="block animate-fade-in">
        {card}
      </Link>
    );
  }

  return <div className="animate-fade-in">{card}</div>;
}

export default function StudentBoard({ initialQuestions }: { initialQuestions: Question[] }) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/questions/recent", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions ?? []);
          setLastUpdated(new Date());
        }
      } catch {
        // 静默失败，保留上一次数据
      }
    };

    refresh(); // 立即刷新一次，不等 5 秒
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* 顶部栏 */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{
          background: "rgba(250,249,247,0.92)",
          backdropFilter: "blur(8px)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
            >
              AI Class
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              课堂问答公示板
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Link
              href="/teacher"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:opacity-80 active:scale-95"
              style={{ background: "var(--color-teacher)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              教师入口
            </Link>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }} suppressHydrationWarning>
              {lastUpdated.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {questions.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-xl font-medium" style={{ color: "var(--color-text-secondary)" }}>
              暂无问题
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
              等待老师发布课堂问题……
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
