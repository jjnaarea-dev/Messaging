import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Contact, Group, GroupMember } from "../lib/types";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [groupsRes, contactsRes, membersRes] = await Promise.all([
      supabase.from("groups").select("*").order("name"),
      supabase.from("contacts").select("*").order("name"),
      supabase.from("group_members").select("*"),
    ]);
    const firstError = groupsRes.error ?? contactsRes.error ?? membersRes.error;
    if (firstError) {
      setError(firstError.message);
      return;
    }
    setGroups(groupsRes.data ?? []);
    setContacts(contactsRes.data ?? []);
    setMembers(membersRes.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addGroup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: insertError } = await supabase
      .from("groups")
      .insert({ name: newGroupName.trim() });
    if (insertError) setError(insertError.message);
    else {
      setNewGroupName("");
      await load();
    }
  }

  async function removeGroup(id: string) {
    await supabase.from("groups").delete().eq("id", id);
    await load();
  }

  async function toggleMember(groupId: string, contactId: string, isMember: boolean) {
    if (isMember) {
      await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("contact_id", contactId);
    } else {
      await supabase.from("group_members").insert({ group_id: groupId, contact_id: contactId });
    }
    await load();
  }

  function memberCount(groupId: string) {
    return members.filter((m) => m.group_id === groupId).length;
  }

  return (
    <div>
      <form onSubmit={addGroup} className="mb-6 flex gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <input
          required
          placeholder="New group name (e.g. Family)"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Create
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {groups.map((g) => {
          const isOpen = expanded === g.id;
          return (
            <li key={g.id} className="rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : g.id)}
                  className="flex-1 text-left"
                >
                  <p className="font-medium">{g.name}</p>
                  <p className="text-sm text-slate-500">
                    {memberCount(g.id)} member{memberCount(g.id) === 1 ? "" : "s"} — click to edit
                  </p>
                </button>
                <button
                  onClick={() => removeGroup(g.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-3">
                  {contacts.length === 0 && (
                    <p className="text-sm text-slate-500">Add contacts first, then pick members here.</p>
                  )}
                  <ul className="space-y-1">
                    {contacts.map((c) => {
                      const isMember = members.some(
                        (m) => m.group_id === g.id && m.contact_id === c.id,
                      );
                      return (
                        <li key={c.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={isMember}
                              onChange={() => toggleMember(g.id, c.id, isMember)}
                              className="h-4 w-4"
                            />
                            <span>{c.name}</span>
                            <span className="text-sm text-slate-400">{c.phone}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
        {groups.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            No groups yet. Create one above, then add members to it.
          </li>
        )}
      </ul>
    </div>
  );
}
