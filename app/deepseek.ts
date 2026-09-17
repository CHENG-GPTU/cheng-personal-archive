import { getRuntimeBindings } from "../runtime-env";

type DeepSeekAction = "coach" | "evaluate";

type DeepSeekMessage = { role: "system" | "user" | "assistant"; content: string };

type DeepSeekResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function callDeepSeek({
  action,
  messages,
  userId,
}: {
  action: DeepSeekAction;
  messages: DeepSeekMessage[];
  userId: string;
}) {
  const config = getRuntimeBindings();
  const apiKey = config.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_NOT_CONFIGURED");
  }

  const isEvaluation = action === "evaluate";
  const model = isEvaluation
    ? config.DEEPSEEK_EVALUATION_MODEL || process.env.DEEPSEEK_EVALUATION_MODEL || "deepseek-v4-pro"
    : config.DEEPSEEK_COACH_MODEL || process.env.DEEPSEEK_COACH_MODEL || "deepseek-v4-flash";
  const body = {
    model,
    messages,
    user_id: userId,
    max_tokens: isEvaluation ? 1800 : 900,
    temperature: isEvaluation ? 0.1 : 0.35,
    thinking: { type: isEvaluation ? "enabled" : "disabled" },
    ...(isEvaluation
      ? { reasoning_effort: "high", response_format: { type: "json_object" } }
      : {}),
  };

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await response.json() as DeepSeekResponse;
      if (!response.ok) {
        throw new Error(payload.error?.message || `DeepSeek request failed (${response.status})`);
      }
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("DeepSeek returned empty content");
      return { content, model };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("DeepSeek request failed");
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error("DeepSeek request failed");
}

export function parseJsonObject(content: string): unknown {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}
