import fs from "fs/promises";

const endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
const safetyModel = process.env.NVIDIA_SAFETY_MODEL || "nvidia/nemotron-3.5-content-safety";

// Immediate deterministic protection, including common English, Sinhala and Tamil abuse.
// AI moderation runs after this layer to detect variations, context and languages not listed here.
const blockedTerms = [
  "fuck", "fucker", "fucking", "bitch", "asshole", "motherfucker", "cunt", "whore",
  "හුත්ත", "පකයා", "වේසි", "කැරියා", "පක", "හුක",
  "ஓத்தா", "தேவடியா", "புண்டை", "சுண்ணி", "கூதி", "மயிரு",
  "otha", "thevidiya", "pundai", "sunni", "koothi", "pakaya", "wesi",
  // Common romanized Sinhala profanity and deliberately shortened/altered spellings.
  "hutto", "wutto", "ammata", "hukkanne", "hutti", "httpu", "pacaya",
  "htti", "httk", "huththak", "ammt", "hcnn", "hcnw", "hukanawa",
  "criya", "kariya", "vesige putha", "vesi", "ponnaya",
];

function normalize(value) {
  return String(value || "").normalize("NFKC");
}

export function redactBlockedTerms(value) {
  let output = normalize(value);
  for (const term of blockedTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=$|[^\\p{L}\\p{N}])`, "giu"),
      (_match, prefix, word) => `${prefix}${"*".repeat([...word].length)}`);
  }
  return output;
}

function parseSafety(content = "") {
  const unsafe = /user\s+safety["']?\s*[:=]\s*["']?unsafe/i.test(content) ||
    /"user safety"\s*:\s*"unsafe"/i.test(content);
  const categories = content.match(/safety\s+categories["']?\s*[:=]\s*["']?([^\n"}]+)/i)?.[1]?.trim() || "";
  return { safe: !unsafe, categories, raw: content.slice(0, 1000) };
}

async function nvidiaSafetyRequest({ text, imageDataUrl, vision = false }) {
  const apiKey = vision
    ? process.env.NVIDIA_VISION_SAFETY_API_KEY || process.env.NVIDIA_SAFETY_API_KEY || process.env.NVIDIA_API_KEY
    : process.env.NVIDIA_SAFETY_API_KEY || process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  const content = imageDataUrl
    ? [{ type: "text", text: text || "Moderate this chat attachment for nudity, sexual content, violence, hate, abuse, or other unsafe content." }, { type: "image_url", image_url: { url: imageDataUrl } }]
    : text;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: safetyModel,
      messages: [{ role: "user", content }],
      max_tokens: 120,
      temperature: 0,
      stream: false,
      chat_template_kwargs: { request_categories: "/categories" },
    }),
    signal: AbortSignal.timeout(Number(process.env.CHAT_MODERATION_TIMEOUT_MS || 20000)),
  });
  if (!response.ok) throw new Error(`NVIDIA safety service returned ${response.status}.`);
  const data = await response.json();
  return parseSafety(data.choices?.[0]?.message?.content || "");
}

async function groqTextSafety(text) {
  if (!process.env.GROQ_API_KEY) return null;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0,
      max_completion_tokens: 80,
      messages: [
        { role: "system", content: "You are a strict multilingual chat moderator. Detect profanity, harassment, hate, sexual solicitation, threats and abuse, including Sinhala, Tamil and romanized regional language. Reply only SAFE or UNSAFE followed by a short category." },
        { role: "user", content: text },
      ],
    }),
    signal: AbortSignal.timeout(Number(process.env.CHAT_MODERATION_TIMEOUT_MS || 20000)),
  });
  if (!response.ok) throw new Error(`Groq moderation returned ${response.status}.`);
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return { safe: !/^\s*UNSAFE/i.test(raw), categories: raw.replace(/^\s*(SAFE|UNSAFE)\s*/i, "").trim(), raw };
}

export async function moderateChatText(text) {
  const sanitized = redactBlockedTerms(text);
  if (sanitized !== normalize(text))
    return { safe: false, sanitized, provider: "local", categories: "profanity_or_abusive_language" };
  if (!sanitized.trim()) return { safe: true, sanitized, provider: "local" };
  try {
    const result = await nvidiaSafetyRequest({ text: sanitized }) || await groqTextSafety(sanitized);
    return result ? { ...result, sanitized, provider: "ai" } : { safe: true, sanitized, provider: "local" };
  } catch (error) {
    if (String(process.env.CHAT_MODERATION_FAIL_CLOSED || "true") !== "false")
      return { safe: false, sanitized, categories: "moderation_service_unavailable", error: error.message };
    return { safe: true, sanitized, provider: "local", warning: error.message };
  }
}

export async function moderateChatImage(filePath, mimeType, prompt = "") {
  const bytes = await fs.readFile(filePath);
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
  try {
    const result = await nvidiaSafetyRequest({ text: prompt, imageDataUrl: dataUrl, vision: true });
    if (!result) return { safe: false, categories: "vision_moderation_not_configured" };
    return result;
  } catch (error) {
    return { safe: false, categories: "vision_moderation_unavailable", error: error.message };
  }
}
