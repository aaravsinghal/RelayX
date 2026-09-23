import { NextRequest, NextResponse } from 'next/server';

// Google periodically retires model IDs. Try these in order and fall through
// to the next on a 404 "model not found / no longer available" response, so
// a single deprecation doesn't hard-break the feature.
const GEMINI_MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

async function callGemini(model: string, apiKey: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1600 },
    }),
  });
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, prompt } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'Missing Gemini API key.' }, { status: 400 });
    }
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt.' }, { status: 400 });
    }

    let lastError: { status: number; body: string } | null = null;

    for (const model of GEMINI_MODEL_CANDIDATES) {
      const res = await callGemini(model, apiKey, prompt);

      if (res.ok) {
        const data = await res.json();
        const text: string =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ??
          'No response from Gemini.';
        return NextResponse.json({ text, model });
      }

      const errText = await res.text();
      lastError = { status: res.status, body: errText };

      // only a missing/retired model should fall through to the next candidate;
      // any other failure (bad key, quota, etc.) should surface immediately
      if (res.status !== 404) break;
    }

    return NextResponse.json(
      { error: `Gemini API error (${lastError?.status}): ${lastError?.body.slice(0, 300)}` },
      { status: lastError?.status ?? 500 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
