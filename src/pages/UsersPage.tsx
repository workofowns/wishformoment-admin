import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Search, ChevronDown, ShieldCheck, ShieldAlert, BadgeCheck,
  Trash2, UserCog, Loader2, Eye, ArrowRight, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  display_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

interface UsersResponse {
  rows: User[];
  total: number;
}

// ── Main Component ────────────────────────────────────────────────────────────

const UsersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["adminUsers", search],
    queryFn: () => fetchApi(`/users?search=${encodeURIComponent(search)}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User deleted permanently");
    },
    onError: (e: any) => toast.error(e.message || "Deletion failed"),
  });

  const filtered = data?.rows || [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <p className="sub-label mb-1">User Management</p>
          <h1 className="section-header text-3xl">Users</h1>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-sm border border-border/50">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_1.1fr_0.5fr_0.65fr_0.65fr] gap-4 px-6 py-4 bg-muted/30 border-b border-border/50">
            {["Name", "Email", "Role", "Joined", "Actions"].map((h) => (
              <span
                key={h}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >
                {h}
              </span>
            ))}
          </div>

          {isLoading && (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">Fetching user database...</p>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground text-sm font-medium">
              No users match your criteria.
            </div>
          )}

          {!isLoading &&
            filtered.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                {/* Row */}
                <div
                  className={`grid grid-cols-[1fr_1.1fr_0.5fr_0.65fr_0.65fr] gap-4 px-6 py-4 transition-all cursor-pointer items-center group border-b border-border/30 ${
                    expandedUser === user.id
                      ? "bg-primary/5"
                      : "hover:bg-muted/30"
                  }`}
                  onClick={() =>
                    setExpandedUser(expandedUser === user.id ? null : user.id)
                  }
                >
                  {/* Name */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex-shrink-0 btn-primary shadow-none flex items-center justify-center text-white text-[10px] font-black group-hover:scale-110 transition-transform"
                    >
                      {(user.display_name || user.email)
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate max-w-[120px]">
                        {user.display_name || "Anonymous"}
                      </p>
                      {user.is_verified && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                          <BadgeCheck className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <span className="text-sm font-medium text-muted-foreground truncate">
                    {user.email}
                  </span>

                  {/* Role */}
                  <span className="text-[10px] font-bold text-foreground capitalize bg-foreground/5 px-2 py-0.5 rounded-lg w-fit">
                    {user.role}
                  </span>

                  {/* Date */}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </span>

                  {/* Action & Chevron */}
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/users/${user.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-none"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expandedUser === user.id ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded Panel */}
                <AnimatePresence>
                  {expandedUser === user.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 ml-6 mr-6 mb-4 mt-1 rounded-[1.5rem] bg-white border border-border flex flex-col lg:flex-row gap-6 shadow-sm">
                        
                        {/* ── Left: User Info ── */}
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <UserCog className="w-4 h-4 text-primary" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
                              Quick Management
                            </h4>
                          </div>
                          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[11px] font-medium text-muted-foreground">
                            <div>
                              <strong className="text-foreground uppercase tracking-widest text-[9px] mb-0.5 block opacity-50">
                                System ID
                              </strong>
                              <span className="font-mono text-[10px] select-all">{user.id}</span>
                            </div>
                            <div>
                              <strong className="text-foreground uppercase tracking-widest text-[9px] mb-0.5 block opacity-50">
                                Verification
                              </strong>
                              {user.is_verified ? "Authenticated" : "Unverified"}
                            </div>
                            <div>
                              <strong className="text-foreground uppercase tracking-widest text-[9px] mb-0.5 block opacity-50">
                                Role
                              </strong>
                              {user.role.toUpperCase()}
                            </div>
                            <div>
                              <strong className="text-foreground uppercase tracking-widest text-[9px] mb-0.5 block opacity-50">
                                Joined
                              </strong>
                              {format(new Date(user.created_at), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>

                        {/* ── Right: Action Buttons ── */}
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <button
                            onClick={() => navigate(`/users/${user.id}`)}
                            className="flex items-center justify-between px-4 py-2.5 rounded-xl btn-primary text-white text-[11px] font-black uppercase tracking-wider group shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            <span>Open User Details</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </button>


                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  "Hard delete this user? This cannot be undone."
                                )
                              )
                                deleteMutation.mutate(user.id);
                            }}
                            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors group"
                          >
                            <span className="text-[10px] font-bold">Delete Account</span>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;
