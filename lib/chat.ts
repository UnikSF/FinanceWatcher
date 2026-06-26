import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey } from "./categorize";
import { getDb } from "./db";
import { detectRecurring } from "./recurring";
import { budgetProgress, monthlyFlows, spendingByCategory, topMerchants } from "./stats";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** The user's financial data, handed to the model as context for every turn.
 *  Lives in the system prompt (stable prefix) so the conversation caches well. */
function financialContext() {
  const db = getDb();
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonth = prev.toISOString().slice(0, 7);
  return {
    current_month: thisMonth,
    monthly_flows_last_6_months: monthlyFlows(6),
    spending_by_category_this_month: spendingByCategory(thisMonth),
    spending_by_category_last_month: spendingByCategory(prevMonth),
    top_merchants_this_month: topMerchants(thisMonth, 15),
    recurring_expenses: detectRecurring(),
    budgets: budgetProgress(thisMonth),
    goals: db.prepare("SELECT * FROM goals").all(),
  };
}

/** A conversational reply grounded in the user's finances. effort:low keeps it
 *  snappy for chat. ponytail: not streamed — a single request with a loading
 *  state; add SSE streaming if turns get long enough to feel laggy. */
export async function chatReply(messages: ChatMessage[]): Promise<string> {
  const client = new Anthropic({ apiKey: getAnthropicKey() });
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    output_config: { effort: "low" },
    system:
      "You are a personal finance assistant for a user in France (amounts in EUR). " +
      "Answer questions about their finances using the data below — be concise and concrete, citing real numbers and merchant names from the data rather than generalities. " +
      "If a question isn't about their finances, still answer briefly and helpfully. Reply in the user's language.\n\n" +
      `User's financial data (JSON):\n${JSON.stringify(financialContext())}`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  if (response.stop_reason === "refusal") {
    return "Sorry, I can't help with that one.";
  }
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "(no response)";
}
