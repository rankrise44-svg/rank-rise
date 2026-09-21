/* ═══════════════════════════════════════════════════════════════════════
   Talking to the engine.

   Every generating endpoint streams Server-Sent Events, for one reason:
   these calls take 20-40 seconds, and a page that shows nothing for 40
   seconds reads as broken — never more so than in front of an audience.
   Streaming gives the UI real byte counts to move a progress narrative
   with, so the screen only claims progress that has actually happened.
   ═══════════════════════════════════════════════════════════════════════ */

export class EngineError extends Error {
  constructor(message, kind = 'failed') { super(message); this.kind = kind; }
}

/**
 * POST to a streaming endpoint.
 * @param {string}   path      e.g. 'diagnose'
 * @param {object}   payload
 * @param {object}   handlers  { onProgress(chars) }
 * @param {AbortSignal} [signal]
 * @returns {Promise<object>}  the `result` payload
 */
export async function stream(path, payload, { onProgress } = {}, signal) {
  let res;
  try {
    res = await fetch(`/api/${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new EngineError('Could not reach the engine. Check your connection.', 'offline');
  }

  // 503 + no_key is the expected answer on a deployment with no API key.
  // It is not an error state — it is the signal to fall back to the sample
  // run, clearly labelled, so the flow can still be walked end to end.
  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    if (body.error === 'no_key') throw new EngineError(body.message ?? 'No API key configured.', 'no_key');
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new EngineError(body.message ?? `The engine returned ${res.status}.`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line. Anything after the last
    // one is a partial frame — leave it in the buffer for the next chunk.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
      const raw   = frame.match(/^data:\s*([\s\S]*)$/m)?.[1];
      if (!event || raw == null) continue;

      let data;
      try { data = JSON.parse(raw); } catch { continue; }

      if (event === 'progress')     onProgress?.(data.chars ?? 0);
      else if (event === 'result')  result = data;
      else if (event === 'failed')  throw new EngineError(data.message ?? 'Generation failed.');
    }
  }

  if (!result) throw new EngineError('The engine closed without returning a result. Try again.');
  return result;
}
