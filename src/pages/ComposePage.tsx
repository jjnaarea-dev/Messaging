import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Contact, Group, GroupMember } from "../lib/types";

interface SendResult {
  sent: number;
  failed: number;
  results: { name: string; status: string; error: string | null }[];
}

export default function ComposePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [contactsRes, groupsRes, membersRes] = await Promise.all([
        supabase.from("contacts").select("*").order("name"),
        supabase.from("groups").select("*").order("name"),
        supabase.from("group_members").select("*"),
      ]);
      setContacts(contactsRes.data ?? []);
      setGroups(groupsRes.data ?? []);
      setMembers(membersRes.data ?? []);
    })();
  }, []);

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selected.has(c.id)),
    [contacts, selected],
  );

  function toggleContact(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectGroup(groupId: string) {
    const groupContactIds = members
      .filter((m) => m.group_id === groupId)
      .map((m) => m.contact_id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = groupContactIds.every((id) => next.has(id));
      for (const id of groupContactIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function send() {
    setSending(true);
    setError(null);
    setResult(null);
    const { data, error: fnError } = await supabase.functions.invoke("send-message", {
      body: { body, contactIds: [...selected] },
    });
    if (fnError) {
      setError(fnError.message);
    } else if (data?.error) {
      setError(data.error);
    } else {
      setResult(data as SendResult);
      setBody("");
      setSelected(new Set());
    }
    setSending(false);
  }

  const canSend = body.trim().length > 0 && selected.size > 0 && !sending;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">1. Pick recipients</h2>
        {groups.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => selectGroup(g.id)}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100"
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {contacts.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleContact(c.id)}
                  className="h-4 w-4"
                />
                <span>{c.name}</span>
                <span className="text-sm text-slate-400">{c.phone}</span>
              </label>
            </li>
          ))}
          {contacts.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500">
              No contacts yet — add some on the Contacts tab.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">2. Write your message</h2>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Type the message everyone will receive individually…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-slate-400">
          {body.length} characters{body.length > 160 ? ` — will send as ${Math.ceil(body.length / 153)} SMS segments` : ""}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">3. Send</h2>
        <p className="mb-3 text-sm text-slate-500">
          {selected.size === 0
            ? "No recipients selected."
            : `Sends individually to ${selected.size} ${selected.size === 1 ? "person" : "people"}: ${selectedContacts
                .map((c) => c.name)
                .join(", ")}. They won't see each other.`}
        </p>
        <button
          onClick={send}
          disabled={!canSend}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {sending ? "Sending…" : `Send to ${selected.size || "…"} ${selected.size === 1 ? "person" : "people"}`}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {result && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium">
              ✅ {result.sent} sent{result.failed > 0 ? `, ❌ ${result.failed} failed` : ""}
            </p>
            {result.results
              .filter((r) => r.status === "failed")
              .map((r, i) => (
                <p key={i} className="text-red-600">
                  {r.name}: {r.error}
                </p>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
