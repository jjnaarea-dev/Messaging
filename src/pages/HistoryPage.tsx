import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Message } from "../lib/types";

export default function HistoryPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: loadError } = await supabase
        .from("messages")
        .select("id, body, created_at, message_recipients(id, name, phone, status, error)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (loadError) setError(loadError.message);
      else setMessages((data as Message[]) ?? []);
    })();
  }, []);

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <ul className="space-y-3">
        {messages.map((m) => {
          const sent = m.message_recipients.filter((r) => r.status === "sent").length;
          const failed = m.message_recipients.filter((r) => r.status === "failed");
          return (
            <li key={m.id} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="mb-2 whitespace-pre-wrap">{m.body}</p>
              <p className="text-sm text-slate-500">
                {new Date(m.created_at).toLocaleString()} — sent to {sent} of {m.message_recipients.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {m.message_recipients.map((r) => r.name).join(", ")}
              </p>
              {failed.map((r) => (
                <p key={r.id} className="mt-1 text-sm text-red-600">
                  {r.name} ({r.phone}): {r.error}
                </p>
              ))}
            </li>
          );
        })}
        {messages.length === 0 && !error && (
          <li className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            Nothing sent yet. Your sent messages will show up here.
          </li>
        )}
      </ul>
    </div>
  );
}
