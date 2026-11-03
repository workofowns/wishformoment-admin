import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  MessageSquare,
  Search,
  Mail,
  User,
  Clock,
  CheckCircle2,
  X,
  Plus,
  Inbox,
  Send,
  Flag,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "pending" | "read" | "replied";
  created_at: string;
}

const ContactMessages = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const { data: messagesRes, isLoading } = useQuery({
    queryKey: ["adminContactMessages"],
    queryFn: () => fetchApi("/contact-messages"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) =>
      fetchApi(`/contact-messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminContactMessages"] });
      toast.success("Message status updated");
    },
    onError: (e: any) => toast.error(e.message || "Update failed")
  });

  const messages = messagesRes?.rows || [];
  const filtered = messages.filter((m: ContactMessage) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: ContactMessage["status"]) => {
    switch (status) {
      case "replied": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "read": return "bg-blue-50 text-blue-600 border-blue-200";
      default: return "bg-amber-50 text-amber-600 border-amber-200";
    }
  };

  return (
    <div className="w-full">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="sub-label mb-1">Support Desk</p>
            <h1 className="section-header text-3xl">Contact Messages</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Inbox List */}
          <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto p-2 custom-scrollbar">
            {isLoading ? (
              <p>Loading messages...</p>
            ) : filtered.length === 0 ? (
              <div className="glass-card rounded-[2rem] p-10 text-center flex flex-col items-center">
                <Inbox className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Inbox Empty</p>
              </div>
            ) : (
              filtered.map((msg: ContactMessage) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`glass-card p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/30 ${selectedMessage?.id === msg.id ? "bg-primary/5 border-primary shadow-lg ring-4 ring-primary/5 scale-[1.02]" : "border-border"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-lg border ${getStatusColor(msg.status)}`}>
                      {msg.status}
                    </span>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">
                      {format(new Date(msg.created_at), "MMM d")}
                    </p>
                  </div>
                  <h4 className="text-sm font-bold truncate text-foreground">{msg.subject}</h4>
                  <p className="text-xs text-muted-foreground truncate">{msg.name}</p>
                </div>
              ))
            )}
          </div>

          {/* Reading Pane */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedMessage ? (
                <motion.div
                  key={selectedMessage.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass-card rounded-[2rem] border border-border p-8 h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-foreground leading-tight">{selectedMessage.subject}</h2>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold">{selectedMessage.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border">
                          <Mail className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold font-mono">{selectedMessage.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-1.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(selectedMessage.created_at), "PP p")}
                      </div>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: selectedMessage.id, status: "replied" })}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${selectedMessage.status === "replied" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "hover:bg-primary hover:text-white border-primary text-primary"}`}
                      >
                        {selectedMessage.status === "replied" ? "Replied" : "Mark as Replied"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-2xl p-6 mb-8 flex-1 border border-border/50">
                    <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-auto pt-6 border-t border-border/50">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                      onClick={() => updateStatusMutation.mutate({ id: selectedMessage.id, status: "read" })}
                      className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl"
                    >
                      <Send className="w-4 h-4" /> Compose Reply
                    </a>
                    <button className="px-6 py-3.5 rounded-2xl bg-muted text-muted-foreground hover:text-foreground font-bold text-sm transition-all flex items-center justify-center gap-2">
                      <Flag className="w-4 h-4" /> Report Spam
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="glass-card rounded-[2.5rem] p-20 flex flex-col items-center justify-center text-center opacity-40 border-2 border-dashed border-border h-full">
                  <div className="w-20 h-20 rounded-[2rem] bg-muted flex items-center justify-center text-4xl mb-6">
                    📬
                  </div>
                  <h3 className="section-header text-xl">Select a message</h3>
                  <p className="text-xs text-muted-foreground mt-2 max-w-xs font-medium uppercase tracking-[0.2em]">Select an inquiry from the inbox to read and respond</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
  );
};

export default ContactMessages;
