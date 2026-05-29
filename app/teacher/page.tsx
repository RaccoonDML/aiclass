import { supabase, type Question } from "@/lib/supabase";
import TeacherConsole from "./TeacherConsole";

export const dynamic = "force-dynamic";

async function getQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as Question[];
}

export default async function TeacherPage() {
  const questions = await getQuestions();

  return <TeacherConsole initialQuestions={questions} />;
}
