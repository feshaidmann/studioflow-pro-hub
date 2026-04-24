import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Minimal VAPID / Web Push implementation for Deno
async function importPrivateKey(pkcs8Base64url: string): Promise<CryptoKey> {
  const padding = "=".repeat((4 - (pkcs8Base64url.length % 4)) % 4);
  const base64 = (pkcs8Base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function buildVapidAuthHeader(
  audience: string,
  publicKeyB64url: string,
  privateKey: CryptoKey
): Promise<string> {
  const header = base64urlEncode(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  );
  const payload = base64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: "mailto:noreply@jspflux.app",
      })
    )
  );
  const signingInput = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    signingInput
  );
  const jwt = `${header}.${payload}.${base64urlEncode(sig)}`;
  return `vapid t=${jwt},k=${publicKeyB64url}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch subscriptions for the user
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error || !subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const privateKey = await importPrivateKey(vapidPrivate);

    const payload = JSON.stringify({ title, body: body || "", url: url || "/" });
    let sent = 0;

    for (const sub of subs) {
      try {
        const origin = new URL(sub.endpoint).origin;
        const vapidAuth = await buildVapidAuthHeader(origin, vapidPublic, privateKey);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            Authorization: vapidAuth,
            TTL: "86400",
          },
          body: new TextEncoder().encode(payload),
        });

        if (res.ok || res.status === 201) {
          sent++;
        } else if (res.status === 410 || res.status === 404) {
          // Subscription expired — delete it
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      } catch (_) {
        // individual send failure — continue
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
