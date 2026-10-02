import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { listStudents, Student } from "../../services/students";
import { getMyHomeroomStudents, HomeroomStudent } from "../../services/incidents";
import {
  Thread, Message, ChildForMessaging, StudentGuardian,
  listMyThreads, startOrGetThread, listThreadMessages, sendMessage, markThreadRead,
  getMyChildrenWithClassTeacher, getStudentGuardiansForMessaging
} from "../../services/messaging";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function MessagesPage() {
  const { profile } = useAuth();
  const isParent = profile?.role === "parent";
  const isAdminTier = profile && ["school_owner", "school_admin", "principal", "vice_principal", "super_admin"].includes(profile.role);
  const isTeacher = profile?.role === "teacher";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Parent-side "new message" state
  const [children, setChildren] = useState<ChildForMessaging[]>([]);
  const [parentForm, setParentForm] = useState({ studentId: "" });

  // Staff-side "new message" state
  const [staffStudents, setStaffStudents] = useState<(HomeroomStudent | Student)[]>([]);
  const [guardians, setGuardians] = useState<StudentGuardian[]>([]);
  const [staffForm, setStaffForm] = useState({ studentId: "", guardianId: "" });

  async function loadThreads() {
    setLoading(true);
    setThreads(await listMyThreads());
    setLoading(false);
  }

  useEffect(() => {
    loadThreads();
    if (isParent) getMyChildrenWithClassTeacher().then(setChildren).catch(() => {});
    if (isAdminTier) listStudents().then(setStaffStudents).catch(() => {});
    if (isTeacher) getMyHomeroomStudents().then(setStaffStudents).catch(() => {});
  }, []);

  useEffect(() => {
    if (!staffForm.studentId) { setGuardians([]); return; }
    getStudentGuardiansForMessaging(staffForm.studentId).then(setGuardians).catch(() => setGuardians([]));
  }, [staffForm.studentId]);

  async function openThread(threadId: string) {
    setActiveId(threadId);
    setMessages(await listThreadMessages(threadId));
    await markThreadRead(threadId);
    loadThreads();
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !profile?.id || !draft.trim()) return;
    setSending(true);
    await sendMessage(activeId, profile.id, draft.trim());
    setDraft("");
    setMessages(await listThreadMessages(activeId));
    setSending(false);
    loadThreads();
  }

  async function handleParentStartNew(e: React.FormEvent) {
    e.preventDefault();
    const child = children.find((c) => c.student_id === parentForm.studentId);
    if (!child?.class_teacher_id) { alert("This child has no class teacher assigned yet."); return; }
    try {
      const threadId = await startOrGetThread(child.student_id, child.class_teacher_id);
      setShowNew(false);
      setParentForm({ studentId: "" });
      await loadThreads();
      openThread(threadId);
    } catch (err: any) {
      alert(err.message ?? "Couldn't start conversation.");
    }
  }

  async function handleStaffStartNew(e: React.FormEvent) {
    e.preventDefault();
    if (!staffForm.studentId || !staffForm.guardianId) return;
    try {
      const threadId = await startOrGetThread(staffForm.studentId, staffForm.guardianId);
      setShowNew(false);
      setStaffForm({ studentId: "", guardianId: "" });
      await loadThreads();
      openThread(threadId);
    } catch (err: any) {
      alert(err.message ?? "Couldn't start conversation.");
    }
  }

  const activeThread = threads.find((t) => t.thread_id === activeId);
  const selectedChild = children.find((c) => c.student_id === parentForm.studentId);

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Messages</h1>
        {(isParent || isAdminTier || isTeacher) && (
          <Button onClick={() => setShowNew((s) => !s)}>{showNew ? "Cancel" : "New message"}</Button>
        )}
      </div>

      {showNew && isParent && (
        <Card className="mb-4">
          <form onSubmit={handleParentStartNew} className="space-y-3">
            <select required value={parentForm.studentId} onChange={(e) => setParentForm({ studentId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select your child…</option>
              {children.map((c) => <option key={c.student_id} value={c.student_id}>{c.full_name}</option>)}
            </select>
            {selectedChild && (
              <p className="text-xs text-slate-500">
                {selectedChild.class_teacher_name
                  ? `This will message ${selectedChild.class_teacher_name}, ${selectedChild.full_name}'s class teacher.`
                  : "This child has no class teacher assigned yet — contact school administration instead."}
              </p>
            )}
            <Button type="submit" disabled={!selectedChild?.class_teacher_id}>Start conversation</Button>
          </form>
        </Card>
      )}

      {showNew && (isAdminTier || isTeacher) && (
        <Card className="mb-4">
          <form onSubmit={handleStaffStartNew} className="space-y-3">
            <select required value={staffForm.studentId} onChange={(e) => setStaffForm({ studentId: e.target.value, guardianId: "" })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select student…</option>
              {staffStudents.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.admission_number})</option>)}
            </select>
            {isTeacher && staffStudents.length === 0 && (
              <p className="text-xs text-amber-600">No homeroom class is assigned to you.</p>
            )}
            <select required value={staffForm.guardianId} onChange={(e) => setStaffForm({ ...staffForm, guardianId: e.target.value })}
              disabled={!staffForm.studentId} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select parent/guardian…</option>
              {guardians.map((g) => <option key={g.guardian_profile_id} value={g.guardian_profile_id}>{g.guardian_name} ({g.relationship})</option>)}
            </select>
            {staffForm.studentId && guardians.length === 0 && (
              <p className="text-xs text-amber-600">This student has no parent/guardian with portal access yet.</p>
            )}
            <Button type="submit" disabled={!staffForm.guardianId}>Start conversation</Button>
          </form>
        </Card>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden">
        <Card className="w-64 shrink-0 overflow-y-auto p-0">
          {loading && <p className="p-4 text-sm text-slate-400">Loading…</p>}
          {!loading && threads.length === 0 && <p className="p-4 text-sm text-slate-400">No conversations yet.</p>}
          {threads.map((t) => (
            <button key={t.thread_id} onClick={() => openThread(t.thread_id)}
              className={`block w-full border-b border-slate-100 p-3 text-left text-sm hover:bg-slate-50 ${activeId === t.thread_id ? "bg-brand-50" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.other_name}</span>
                {t.unread_count > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-xs text-white">{t.unread_count}</span>}
              </div>
              <p className="text-xs text-slate-400">re: {t.student_name}</p>
              {t.last_message && <p className="mt-1 truncate text-xs text-slate-500">{t.last_message}</p>}
            </button>
          ))}
        </Card>

        <Card className="flex flex-1 flex-col p-0">
          {!activeThread ? (
            <p className="m-auto text-sm text-slate-400">Select a conversation</p>
          ) : (
            <>
              <div className="border-b border-slate-100 p-3">
                <p className="font-medium">{activeThread.other_name}</p>
                <p className="text-xs text-slate-400">re: {activeThread.student_name}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === profile?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.sender_id === profile?.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {m.body}
                      <p className={`mt-1 text-[10px] ${m.sender_id === profile?.id ? "text-brand-100" : "text-slate-400"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 p-3">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <Button type="submit" loading={sending}>Send</Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}