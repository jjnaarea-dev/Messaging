import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Contact } from "../lib/types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("contacts")
      .select("*")
      .order("name");
    if (loadError) setError(loadError.message);
    else setContacts(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addContact(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Enter a valid phone number, e.g. +1 555 123 4567.");
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase
      .from("contacts")
      .insert({ name: name.trim(), phone: normalized });
    if (insertError) {
      setError(insertError.message);
    } else {
      setName("");
      setPhone("");
      await load();
    }
    setBusy(false);
  }

  async function removeContact(id: string) {
    await supabase.from("contacts").delete().eq("id", id);
    await load();
  }

  return (
    <div>
      <form onSubmit={addContact} className="mb-6 flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm sm:flex-row">
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          required
          placeholder="Phone (+1 555 123 4567)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-slate-500">{c.phone}</p>
            </div>
            <button
              onClick={() => removeContact(c.id)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </li>
        ))}
        {contacts.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            No contacts yet. Add your first one above.
          </li>
        )}
      </ul>
    </div>
  );
}

// Keeps digits and a leading +; assumes US (+1) when 10 digits are given.
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (cleaned.startsWith("+") && digits.length >= 8) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
