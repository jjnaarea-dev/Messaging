// Supabase Edge Function: send-message
//
// Receives { body: string, contactIds: string[] } and sends the message body
// as an INDIVIDUAL SMS to each contact via Twilio, so recipients never see
// each other and replies come back one-on-one. Every attempt is logged to
// messages / message_recipients.
//
// Required secrets (set with `supabase secrets set` or in the dashboard):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { body, contactIds } = await req.json();
    if (!body || typeof body !== "string" || !body.trim()) {
      return jsonResponse({ error: "Message body is required." }, 400);
    }
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return jsonResponse({ error: "Select at least one recipient." }, 400);
    }

    // Client bound to the caller's JWT — RLS guarantees we only ever read
    // the caller's own contacts and write the caller's own message log.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Not signed in." }, 401);
    }

    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, name, phone")
      .in("id", contactIds);
    if (contactsError) throw contactsError;
    if (!contacts || contacts.length === 0) {
      return jsonResponse({ error: "No matching contacts found." }, 400);
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({ body: body.trim(), user_id: userData.user.id })
      .select("id")
      .single();
    if (messageError) throw messageError;

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!accountSid || !authToken || !fromNumber) {
      return jsonResponse(
        { error: "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER secrets." },
        500,
      );
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioAuth = "Basic " + btoa(`${accountSid}:${authToken}`);

    const results = [];
    for (const contact of contacts) {
      let status = "sent";
      let error: string | null = null;
      let providerSid: string | null = null;

      try {
        const params = new URLSearchParams({
          To: contact.phone,
          From: fromNumber,
          Body: body.trim(),
        });
        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: twilioAuth,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });
        const twilioData = await twilioRes.json();
        if (twilioRes.ok) {
          providerSid = twilioData.sid ?? null;
        } else {
          status = "failed";
          error = twilioData.message ?? `Twilio error ${twilioRes.status}`;
        }
      } catch (e) {
        status = "failed";
        error = e instanceof Error ? e.message : String(e);
      }

      await supabase.from("message_recipients").insert({
        message_id: message.id,
        contact_id: contact.id,
        name: contact.name,
        phone: contact.phone,
        status,
        error,
        provider_sid: providerSid,
      });

      results.push({ contactId: contact.id, name: contact.name, status, error });
    }

    const sent = results.filter((r) => r.status === "sent").length;
    return jsonResponse({
      messageId: message.id,
      sent,
      failed: results.length - sent,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
