import { supabase, type Question } from "@/lib/supabase";
import StudentBoard from "./StudentBoard";

async function getRecentQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("id, content, status, published_at, closed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as Question[];
}

export default async function StudentPage() {
  const questions = await getRecentQuestions();

  return <StudentBoard initialQuestions={questions} />;
}
