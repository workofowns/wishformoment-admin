import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Mail, XCircle, Clock, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export interface AttentionData {
  unreadContactMessages: number;
  pendingDeletionRequests: number;
  failedPayments24h: number;
  lowFeedbackCount: number;
}

interface AttentionAlertsProps {
  attention?: AttentionData;
}

const AttentionAlerts = ({ attention }: AttentionAlertsProps) => {
  if (!attention) return null;

  const alerts = [
    {
      id: "contact",
      count: attention.unreadContactMessages,
      label: "Unread Support Inquiries",
      icon: Mail,
      link: "/contact",
      color: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
      dot: "bg-amber-500",
    },
    {
      id: "failed_payments",
      count: attention.failedPayments24h,
      label: "Failed Payments (Last 24h)",
      icon: XCircle,
      link: "/payments?status=failed",
      color: "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100",
      dot: "bg-rose-500",
    },
    {
      id: "deletions",
      count: attention.pendingDeletionRequests,
      label: "Pending Account Deletions",
      icon: Clock,
      link: "/users?status=pending_deletion",
      color: "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100",
      dot: "bg-orange-500",
    },
    {
      id: "feedback",
      count: attention.lowFeedbackCount,
      label: "Low Rating Reviews (≤2★)",
      icon: Star,
      link: "/feedback",
      color: "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100",
      dot: "bg-purple-500",
    },
  ].filter((a) => a.count > 0);

  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-md shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Action Required</h4>
            <p className="text-xs text-muted-foreground">Items requiring administrator attention</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          {alerts.reduce((acc, curr) => acc + curr.count, 0)} pending items
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <AnimatePresence>
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              to={alert.link}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all group ${alert.color}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full ${alert.dot} animate-pulse flex-shrink-0`} />
                <alert.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{alert.label}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <span className="px-1.5 py-0.5 rounded-md bg-white/80 font-black shadow-xs">
                  {alert.count}
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AttentionAlerts;

