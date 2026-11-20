import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const configured = url.startsWith("https://") && key.length > 10 && !url.includes("여기에");

let client: SupabaseClient | null = null;
/** 브라우저에서만 부릅니다 (effect 나 이벤트 핸들러 안에서). */
export function sb(): SupabaseClient {
  if (!client) client = createClient(url, key);
  return client;
}

/** Supabase 응답에서 오류가 있으면 던지고, 없으면 data 를 돌려줍니다. */
export async function ok<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}
