import { supabase, type Question } from "@/lib/supabase";
import { notFound } from "next/navigation";
import AnswerForm from "./AnswerForm";

async function getQuestion(id: string): Promise<Question | null> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Question;
}

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getQuestion(id);

  if (!question) {
    notFound();
  }

  return <AnswerForm question={question} />;
}
