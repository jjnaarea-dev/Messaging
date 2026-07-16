import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import AuthPage from "./pages/AuthPage";
import ContactsPage from "./pages/ContactsPage";
import GroupsPage from "./pages/GroupsPage";
import ComposePage from "./pages/ComposePage";
import HistoryPage from "./pages/HistoryPage";

const navItems = [
  { to: "/compose", label: "Compose" },
  { to: "/contacts", label: "Contacts" },
  { to: "/groups", label: "Groups" },
  { to: "/history", label: "History" },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between py-6">
        <h1 className="text-xl font-bold">📨 Blast Messenger</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Sign out
        </button>
      </header>
      <nav className="mb-6 flex gap-2 rounded-xl bg-white p-1 shadow-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
                isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 pb-12">
        <Routes>
          <Route path="/" element={<Navigate to="/compose" replace />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  );
}
