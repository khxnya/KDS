import { createClient } from "npm:@supabase/supabase-js@2.48.1";

const json = (status: number, body: Record<string, unknown>, origin = "") =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type,idempotency-key",
      "access-control-allow-methods": "POST,OPTIONS",
      "vary": "Origin",
    },
  });

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async request => {
  const allowedOrigin = Deno.env.get("KDS_ALLOWED_ORIGIN") ?? "";
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigin || origin !== allowedOrigin) return json(403, { success: false }, allowedOrigin);
  if (request.method === "OPTIONS") return json(204, {}, allowedOrigin);
  if (request.method !== "POST") return json(405, { success: false }, allowedOrigin);

  const idempotencyKey = clean(request.headers.get("idempotency-key"), 100);
  if (!/^[a-f0-9-]{20,100}$/i.test(idempotencyKey)) return json(400, { success: false, message: "Request identifier missing." }, allowedOrigin);

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return json(400, { success: false, message: "Invalid request." }, allowedOrigin); }
  if (clean(input.botcheck, 10)) return json(200, { success: true }, allowedOrigin);

  const submission = {
    name: clean(input.name, 120),
    email: clean(input.email, 254).toLowerCase(),
    business: clean(input.company, 160),
    phone: clean(input.phone, 40),
    service: clean(input.service, 40),
    timeline: clean(input.timeline, 80),
    contact_method: clean(input.contact, 40),
    budget: Math.max(0, Math.min(10_000_000, Number(input.budget) || 0)),
    message: clean(input.message, 5000),
    marketing_opt_in: input.marketing_opt_in === true,
    consent_version: clean(input.consent_version, 80),
  };
  if (!submission.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email) || submission.message.length < 10 || input.consent !== true) {
    return json(422, { success: false, message: "Check the required enquiry fields." }, allowedOrigin);
  }
  if (!["website", "3d", "other"].includes(submission.service)) return json(422, { success: false, message: "Choose an available service." }, allowedOrigin);

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
  if (turnstileSecret) {
    const token = clean(input.turnstile_token, 2048);
    const ip = request.headers.get("cf-connecting-ip") ?? "";
    try {
      const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: ip }),
      });
      const result = await verify.json().catch(() => ({ success: false }));
      if (!result.success) return json(422, { success: false, message: "Spam check could not be completed." }, allowedOrigin);
    } catch {
      return json(503, { success: false, message: "Spam protection is temporarily unavailable." }, allowedOrigin);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const deliveryKey = Deno.env.get("WEB3FORMS_ACCESS_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !deliveryKey) return json(503, { success: false, message: "Enquiry delivery is not configured." }, allowedOrigin);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const providerRequestId = `web3forms:${idempotencyKey}`;
  const existing = await db.from("kds_contact_submissions").select("id,delivery_state").eq("provider_request_id", providerRequestId).maybeSingle();
  if (existing.error) return json(503, { success: false, message: "Enquiry service unavailable." }, allowedOrigin);
  if (existing.data?.delivery_state === "accepted" || existing.data?.delivery_state === "delivered") {
    return json(200, { success: true, submission_id: existing.data.id }, allowedOrigin);
  }
  const ipHash = await sha256((request.headers.get("cf-connecting-ip") ?? "unknown") + (Deno.env.get("KDS_RATE_SALT") ?? ""));
  const { data: allowed, error: rateError } = await db.rpc("kds_check_contact_rate", { p_fingerprint: ipHash });
  if (rateError) return json(503, { success: false, message: "Enquiry service unavailable." }, allowedOrigin);
  if (!allowed) return json(429, { success: false, message: "Please wait before sending another enquiry." }, allowedOrigin);

  const delivery = new FormData();
  delivery.set("access_key", deliveryKey);
  delivery.set("subject", "New Khanya Digital Studio enquiry");
  delivery.set("from_name", "Khanya Digital Studio website");
  delivery.set("name", submission.name);
  delivery.set("email", submission.email);
  delivery.set("replyto", submission.email);
  delivery.set("business", submission.business);
  delivery.set("phone", submission.phone);
  delivery.set("service", submission.service);
  delivery.set("timeline", submission.timeline);
  delivery.set("preferred_contact", submission.contact_method);
  delivery.set("budget", String(submission.budget));
  delivery.set("message", submission.message);
  delivery.set("marketing_opt_in", submission.marketing_opt_in ? "Yes" : "No");
  delivery.set("request_id", providerRequestId);
  let sent: Response;
  try {
    sent = await fetch("https://api.web3forms.com/submit", { method: "POST", body: delivery });
  } catch {
    return json(502, { success: false, message: "Enquiry delivery could not be reached." }, allowedOrigin);
  }
  const sentBody = await sent.json().catch(() => ({ success: false }));
  const accepted = sent.ok && sentBody.success === true;
  if (!accepted) return json(502, { success: false, message: "Enquiry delivery was not accepted." }, allowedOrigin);

  // The trusted recorder inserts the durable row. Its AFTER INSERT trigger
  // creates the owner notification only after this successful save.
  const metadata = {
    business: submission.business,
    phone: submission.phone,
    timeline: submission.timeline,
    contact_method: submission.contact_method,
    budget: submission.budget,
    marketing_opt_in: submission.marketing_opt_in,
    consent_version: submission.consent_version,
    source: "studio-site",
  };
  const recorded = await db.rpc("kds_record_contact_submission", {
    p_provider_request_id: providerRequestId,
    p_email: submission.email,
    p_name: submission.name,
    p_service: submission.service,
    p_summary: submission.message,
    p_metadata: metadata,
  });
  if (recorded.error || !recorded.data) {
    return json(503, { success: false, message: "The enquiry was delivered but its studio record could not be confirmed. Contact the studio before resending." }, allowedOrigin);
  }
  return json(200, { success: true, submission_id: recorded.data }, allowedOrigin);
});
