import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { Globe, Bell, Shield, Save, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SettingsState {
  general: {
    appName: string;
    defaultTemplate: string;
    supportEmail: string;
    maintenanceMode: boolean;
  };
  notifications: {
    newUserAlerts: boolean;
    dailyAnalyticsReport: boolean;
    templateApprovalRequests: boolean;
    emailNotifications: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
  };
}

const DEFAULT_SETTINGS: SettingsState = {
  general: {
    appName: "WishForMoment",
    defaultTemplate: "Standard Wish",
    supportEmail: "support@wishformoment.com",
    maintenanceMode: false,
  },
  notifications: {
    newUserAlerts: true,
    dailyAnalyticsReport: true,
    templateApprovalRequests: false,
    emailNotifications: true,
  },
  security: {
    twoFactorAuth: true,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
  },
};

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [dirtySections, setDirtySections] = useState<Set<string>>(new Set());

  // 1. Fetch current settings from backend
  const { data, isLoading } = useQuery<{ success?: boolean; data?: SettingsState }>({
    queryKey: ["platformSettings"],
    queryFn: async () => {
      try {
        const res = await fetchApi("/settings");
        if (res?.data) return res;
      } catch (_) {}
      return { data: DEFAULT_SETTINGS };
    },
  });

  useEffect(() => {
    if (data?.data) {
      setFormState({
        general: { ...DEFAULT_SETTINGS.general, ...(data.data.general || {}) },
        notifications: { ...DEFAULT_SETTINGS.notifications, ...(data.data.notifications || {}) },
        security: { ...DEFAULT_SETTINGS.security, ...(data.data.security || {}) },
      });
    }
  }, [data]);

  // 2. Mutation to persist section settings
  const saveMutation = useMutation({
    mutationFn: async (section: keyof SettingsState) => {
      return fetchApi("/settings", {
        method: "PATCH",
        body: JSON.stringify({
          section,
          values: formState[section],
        }),
      });
    },
    onSuccess: (_, section) => {
      queryClient.invalidateQueries({ queryKey: ["platformSettings"] });
      setDirtySections((prev) => {
        const next = new Set(prev);
        next.delete(section);
        return next;
      });
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save settings");
    },
  });

  const handleFieldChange = (section: keyof SettingsState, field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setDirtySections((prev) => new Set(prev).add(section));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Platform Configuration
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              System Settings
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control platform branding, staff notifications, and administrative security parameters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {dirtySections.size > 0 ? (
                <span className="text-amber-600 font-bold">Unsaved changes in {dirtySections.size} section(s)</span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All settings synchronized
                </span>
              )}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Loading Settings...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Section 1: General Settings ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6 border border-border/60"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">General Platform</h3>
                    <p className="text-xs text-muted-foreground">Application name, default templates, and support contact</p>
                  </div>
                </div>

                <button
                  onClick={() => saveMutation.mutate("general")}
                  disabled={saveMutation.isPending || !dirtySections.has("general")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-primary text-white text-xs font-bold transition-all disabled:opacity-40"
                >
                  {saveMutation.isPending && saveMutation.variables === "general" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save General</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <div>
                    <label className="text-xs font-bold text-foreground">Application Name</label>
                    <p className="text-[11px] text-muted-foreground">Display name used in headers and emails</p>
                  </div>
                  <input
                    type="text"
                    value={formState.general.appName}
                    onChange={(e) => handleFieldChange("general", "appName", e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <div>
                    <label className="text-xs font-bold text-foreground">Default Wish Template</label>
                    <p className="text-[11px] text-muted-foreground">Fallback template when none is specified</p>
                  </div>
                  <input
                    type="text"
                    value={formState.general.defaultTemplate}
                    onChange={(e) => handleFieldChange("general", "defaultTemplate", e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <div>
                    <label className="text-xs font-bold text-foreground">Official Support Email</label>
                    <p className="text-[11px] text-muted-foreground">Destination for platform inquiries and notifications</p>
                  </div>
                  <input
                    type="email"
                    value={formState.general.supportEmail}
                    onChange={(e) => handleFieldChange("general", "supportEmail", e.target.value)}
                    className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <label className="text-xs font-bold text-foreground">Maintenance Mode</label>
                    <p className="text-[11px] text-muted-foreground">Temporarily show maintenance page to non-admins</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFieldChange("general", "maintenanceMode", !formState.general.maintenanceMode)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      formState.general.maintenanceMode ? "bg-amber-500" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${
                        formState.general.maintenanceMode ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── Section 2: Notifications ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-6 border border-border/60"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Alerts & Notifications</h3>
                    <p className="text-xs text-muted-foreground">Email and real-time alerts for staff operations</p>
                  </div>
                </div>

                <button
                  onClick={() => saveMutation.mutate("notifications")}
                  disabled={saveMutation.isPending || !dirtySections.has("notifications")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-primary text-white text-xs font-bold transition-all disabled:opacity-40"
                >
                  {saveMutation.isPending && saveMutation.variables === "notifications" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Alerts</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div>
                    <label className="text-xs font-bold text-foreground">New User Signup Alerts</label>
                    <p className="text-[11px] text-muted-foreground">Receive instant notifications on new verified registrations</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFieldChange("notifications", "newUserAlerts", !formState.notifications.newUserAlerts)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      formState.notifications.newUserAlerts ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${
                        formState.notifications.newUserAlerts ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div>
                    <label className="text-xs font-bold text-foreground">Daily Analytics Email Digest</label>
                    <p className="text-[11px] text-muted-foreground">Send daily revenue and activity report at midnight UTC</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFieldChange("notifications", "dailyAnalyticsReport", !formState.notifications.dailyAnalyticsReport)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      formState.notifications.dailyAnalyticsReport ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${
                        formState.notifications.dailyAnalyticsReport ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <label className="text-xs font-bold text-foreground">Template Approval Requests</label>
                    <p className="text-[11px] text-muted-foreground">Require secondary confirmation before publishing templates</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFieldChange("notifications", "templateApprovalRequests", !formState.notifications.templateApprovalRequests)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      formState.notifications.templateApprovalRequests ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${
                        formState.notifications.templateApprovalRequests ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── Section 3: Security & Session ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-6 border border-border/60"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Security & Access Control</h3>
                    <p className="text-xs text-muted-foreground">Authentication restrictions, sessions, and limits</p>
                  </div>
                </div>

                <button
                  onClick={() => saveMutation.mutate("security")}
                  disabled={saveMutation.isPending || !dirtySections.has("security")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-primary text-white text-xs font-bold transition-all disabled:opacity-40"
                >
                  {saveMutation.isPending && saveMutation.variables === "security" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Security</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div>
                    <label className="text-xs font-bold text-foreground">Enforce Two-Factor / Email OTP</label>
                    <p className="text-[11px] text-muted-foreground">Mandate 6-digit email verification code for all admin logins</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFieldChange("security", "twoFactorAuth", !formState.security.twoFactorAuth)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      formState.security.twoFactorAuth ? "bg-emerald-600" : "bg-muted"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${
                        formState.security.twoFactorAuth ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <div>
                    <label className="text-xs font-bold text-foreground">Session Inactivity Timeout (minutes)</label>
                    <p className="text-[11px] text-muted-foreground">Automatically log out inactive administrator sessions</p>
                  </div>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={formState.security.sessionTimeoutMinutes}
                    onChange={(e) => handleFieldChange("security", "sessionTimeoutMinutes", parseInt(e.target.value, 10) || 60)}
                    className="w-full sm:w-32 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div>
                    <label className="text-xs font-bold text-foreground">Max Failed OTP Attempts</label>
                    <p className="text-[11px] text-muted-foreground">Lock IP address temporarily after repeated failed attempts</p>
                  </div>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={formState.security.maxLoginAttempts}
                    onChange={(e) => handleFieldChange("security", "maxLoginAttempts", parseInt(e.target.value, 10) || 5)}
                    className="w-full sm:w-32 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
