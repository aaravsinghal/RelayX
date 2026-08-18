export async function askGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gemini request failed');
  return data.text as string;
}
