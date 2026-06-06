import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
import { prisma } from "../../utils/prisma";
import { cleanArticleForAI } from "./cleanArticle";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

const MODEL = "mistral-small-latest"; // fast + cheap

async function callMistral(prompt: string): Promise<string> {
  const res = await mistral.chat.complete({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 600,
    temperature: 0.7,
  });
  const content = res.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty Mistral response");
  return typeof content === "string" ? content.trim() : content[0]?.type === "text" ? content[0].text.trim() : "";
}

export async function generateScript(article: { title: string; description?: string | null }): Promise<{
  hook: string;
  summary: string;
  content: string;
}> {
  const desc = article.description || "";

  const hook = await callMistral(
    `You are a TV news anchor. Write a single punchy HOOK sentence (max 20 words) to open a news story. 
No preamble, just the hook sentence.
Story: "${article.title}"`
  );

  const summary = await callMistral(
    `Summarise this news story in exactly 2 sentences for a TV broadcast. Be factual, neutral, professional.
Title: "${article.title}"
Details: "${desc}"`
  );

  const content = await callMistral(
    `Write a 60-second TV news script (approximately 150 words) for this story. 
- Start with the hook already provided
- Use clear, spoken English — no jargon
- Include: what happened, where, who is involved, why it matters
- End with a forward-looking statement
- Do NOT include stage directions, [ANCHOR], or formatting tags
- Just the spoken words only

Hook: ${hook}
Story: "${article.title}"
Background: "${desc}"`
  );

  return { hook, summary, content };
}

export async function orchestrateArticle(articleId: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error(`Article not found: ${articleId}`);

  const clean = cleanArticleForAI(article);
  const { hook, summary, content } = await generateScript(clean);

  const script = await prisma.script.upsert({
    where: { articleId: article.id },
    update: { hook, summary, content, status: "ready" },
    create: { articleId: article.id, hook, summary, content, status: "ready" },
  });

  return { hook, summary, content, scriptId: script.id, originalArticle: article };
}
