export async function generalAnswer(
  message,
  { key = process.env.GROQ_API_KEY, fetcher = fetch } = {},
) {
  if (!key) return null;
  const response = await fetcher(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        temperature: 0.4,
        max_completion_tokens: 1200,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful general study assistant. Answer clearly in the language of the question. You cannot access any personal profile, campus records, account, tools or current web data. Never invent personal facts or claim you changed records or made payments. If asked about private records, direct the user to the relevant SmartERP module. Admit uncertainty and do not claim live knowledge.",
          },
          { role: "user", content: message },
        ],
      }),
    },
  );
  if (!response.ok) throw Error("AI service temporarily unavailable");
  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer || typeof answer !== "string")
    throw Error("AI response unavailable");
  return answer;
}
