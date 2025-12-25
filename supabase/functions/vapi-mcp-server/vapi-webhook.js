// Deno/Supabase Edge Function implementation using Web Crypto for HMAC verification

const VAPI_SECRET = Deno.env.get('VAPI_WEBHOOK_SECRET');

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function (req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signature = req.headers.get('x-vapi-signature');
  if (!signature || !VAPI_SECRET) {
    return new Response(JSON.stringify({ error: 'Missing signature or secret' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rawBody = await req.text(); // capture raw body as text for HMAC
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(VAPI_SECRET);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const expectedSignature = toHex(sigBuffer);

    if (signature !== expectedSignature) {
      console.error('Signature mismatch');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('Signature verification error', err);
    return new Response(JSON.stringify({ error: 'Signature verification failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Webhook logic here — parse JSON if needed
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = rawBody;
  }

  // TODO: handle payload
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}