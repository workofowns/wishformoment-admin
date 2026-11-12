import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  UserPlus,
  CreditCard,
  RotateCcw,
  Mail,
  Star,
  Activity,
  Loader2,
  Filter,
  ExternalLink,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE, fetchApi } from "@/lib/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { io } from "socket.io-client";
import { Link } from "react-router-dom";

export interface ActivityRecord {
  id: string;
  type:
    | "user_signup"
    | "wish_created"
    | "payment_paid"
    | "payment_refunded"
    | "contact_message"
    | "feedback_received"
    | string;
  user_name: string;
  details: string | null;
  amount?: number;
  currency?: string;
  created_at: string;
  isLive?: boolean;
}

const RecentActivity = () => {
  const [filter, setFilter] = useState<string>("all");
  const [liveEvents, setLiveEvents] = useState<ActivityRecord[]>([]);

  // 1. Initial Load from Backend API
  const { data, isLoading } = useQuery<{ success?: boolean; data: ActivityRecord[] }>({
    queryKey: ["recentActivity"],
    queryFn: () => fetchApi("/recent-activity?limit=30"),
    refetchInterval: 60000, // Background refresh every 60s
  });

  // 2. Real-time Live Event Streaming via Socket.io
  useEffect(() => {
    const socket = io(API_BASE, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socket.on("live_activity", (incoming: any) => {
      let resolvedType: ActivityRecord["type"] = "wish_created";
      let details = incoming.data?.template_name || incoming.data?.subject || "Activity detected";
      let amount = incoming.data?.amount;
      let currency = incoming.data?.currency || "INR";

      const action = (incoming.action || "").toLowerCase();
      // Page view telemetry belongs exclusively in the Analytics live stream, not transactional activity
      if (action.includes("viewed")) {
        return;
      }

      if (action.includes("payment paid") || action.includes("paid")) {
        resolvedType = "payment_paid";
        details = incoming.data?.template_name || "Premium wish purchase";
      } else if (action.includes("refund")) {
        resolvedType = "payment_refunded";
        details = incoming.data?.reason || "Refund issued";
      } else if (action.includes("signup") || action.includes("login")) {
        resolvedType = "user_signup";
        details = action.includes("signup") ? "registered an account" : "logged in";
      } else if (action.includes("wish")) {
        resolvedType = "wish_created";
      } else if (action.includes("contact")) {
        resolvedType = "contact_message";
        details = incoming.data?.subject || "Support inquiry";
      } else if (action.includes("feedback")) {
        resolvedType = "feedback_received";
        details = incoming.data?.rating ? `${incoming.data.rating}★ feedback submitted` : "Feedback";
      }

      const newLiveRecord: ActivityRecord = {
        id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: resolvedType,
        user_name: incoming.data?.name || incoming.data?.email || "Platform User",
        details,
        amount: amount ? Number(amount) : undefined,
        currency,
        created_at: new Date().toISOString(),
        isLive: true,
      };

      setLiveEvents((prev) => [newLiveRecord, ...prev.slice(0, 15)]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchedActivities = data?.data || [];
  // Merge live incoming socket events on top of fetched activities without duplicate IDs
  const combinedActivities = [
    ...liveEvents,
    ...fetchedActivities.filter((fa) => !liveEvents.some((le) => le.id === fa.id)),
  ];

  const filteredActivities = combinedActivities.filter((item) => {
    if (filter === "all") return true;
    if (filter === "payments") return item.type === "payment_paid" || item.type === "payment_refunded";
    if (filter === "wishes") return item.type === "wish_created";
    if (filter === "users") return item.type === "user_signup";
    if (filter === "support") return item.type === "contact_message" || item.type === "feedback_received";
    return true;
  });

  const getActivityConfig = (type: string) => {
    switch (type) {
      case "payment_paid":
        return {
          action: "completed a payment",
          icon: CreditCard,
          bg: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
          badgeColor: "bg-emerald-100 text-emerald-800",
        };
      case "payment_refunded":
        return {
          action: "was issued a refund",
          icon: RotateCcw,
          bg: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
          badgeColor: "bg-rose-100 text-rose-800",
        };
      case "user_signup":
        return {
          action: "joined WishForMoment",
          icon: UserPlus,
          bg: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
          badgeColor: "bg-blue-100 text-blue-800",
        };
      case "wish_created":
        return {
          action: "created a wish",
          icon: Sparkles,
          bg: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
          badgeColor: "bg-amber-100 text-amber-800",
        };
      case "contact_message":
        return {
          action: "sent a message",
          icon: Mail,
          bg: "bg-violet-500/10 text-violet-600 border border-violet-500/20",
          badgeColor: "bg-violet-100 text-violet-800",
        };
      case "feedback_received":
        return {
          action: "left customer feedback",
          icon: Star,
          bg: "bg-purple-500/10 text-purple-600 border border-purple-500/20",
          badgeColor: "bg-purple-100 text-purple-800",
        };
      default:
        return {
          action: "interacted with platform",
          icon: Activity,
          bg: "bg-primary/10 text-primary border border-primary/20",
          badgeColor: "bg-primary/10 text-primary",
        };
    }
  };

  const formatDistanceSafe = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 }}
      className="glass-card rounded-2xl p-6 h-full flex flex-col justify-between"
    >
      <div>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <h3 className="section-header text-xl">Real-Time Activity Stream</h3>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Sockets
            </span>
          </div>

          <Link
            to="/analytics"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            <span>View Full Analytics</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-5">
          {[
            { id: "all", label: "All Activity" },
            { id: "payments", label: "Payments" },
            { id: "wishes", label: "Wishes" },
            { id: "users", label: "Users" },
            { id: "support", label: "Inquiries" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filter === f.id
                  ? "bg-primary text-white shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Item List */}
      <div className="flex-1 min-h-[300px] max-h-[460px] overflow-y-auto pr-1 space-y-2.5 no-scrollbar">
        {isLoading ? (
          <div className="h-[280px] flex flex-col items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin mb-2" />
            <p className="text-xs text-muted-foreground font-medium">Listening for platform events...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-xs text-muted-foreground">
            <Activity className="w-8 h-8 stroke-[1.5] text-muted-foreground/40 mb-2" />
            <p>No activity detected matching this filter.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredActivities.slice(0, 15).map((activity) => {
              const cfg = getActivityConfig(activity.type);
              const Icon = cfg.icon;

              return (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, x: -10, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className={`flex items-center gap-3.5 p-3 rounded-xl border border-transparent transition-all hover:bg-muted/40 hover:border-border/60 ${
                    activity.isLive ? "bg-primary/5 border-primary/20 shadow-xs" : ""
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Body text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        <span className="font-extrabold text-foreground">{activity.user_name}</span>{" "}
                        <span className="text-muted-foreground">{cfg.action}</span>
                      </p>
                      <span className="text-[10px] font-bold text-muted-foreground/80 flex-shrink-0">
                        {formatDistanceSafe(activity.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      {activity.details && (
                        <p className="text-[11px] text-muted-foreground font-medium truncate">
                          {activity.details}
                        </p>
                      )}

                      {activity.amount !== undefined && activity.amount !== null && (
                        <span className="inline-flex items-center text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex-shrink-0">
                          ₹{activity.amount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          WebSocket feed active
        </span>
        <span>Showing latest {Math.min(filteredActivities.length, 15)} events</span>
      </div>
    </motion.div>
  );
};

export default RecentActivity;
