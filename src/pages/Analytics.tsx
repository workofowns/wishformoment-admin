import { useQuery } from "@tanstack/react-query";
import { API_BASE, fetchApi } from "@/lib/api";
import {
   TrendingUp,
   Users,
   IndianRupee,
   ArrowUpRight,
   Target,
   Zap,
   Activity,
   Eye,
   Share2,
   Clock,
   Layout
} from "lucide-react";
import {
   AreaChart,
   Area,
   XAxis,
   YAxis,
   Tooltip,
   ResponsiveContainer,
   BarChart,
   Bar,
   Cell
} from "recharts";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";

const Analytics = () => {
   const [liveLog, setLiveLog] = useState<any[]>([]);

   // Real-time activity via Socket.io
   useEffect(() => {
      const socket = io(API_BASE);

      socket.on("live_activity", (data) => {
         const iconMap: any = {
            'created wish': Activity,
            'shared wish': Share2,
            'viewed wish': Eye,
            'new signup': Users,
            'user login': Zap
         };

         const colorMap: any = {
            'created wish': 'text-blue-500',
            'shared wish': 'text-purple-500',
            'viewed wish': 'text-amber-500',
            'new signup': 'text-emerald-500',
            'user login': 'text-rose-500'
         };

         const newAction = {
            id: Math.random().toString(36).substr(2, 9),
            action: `${data.action} ${data.data?.template_name || ''}`,
            time: "Just now",
            icon: iconMap[data.action] || Activity,
            color: colorMap[data.action] || 'text-primary'
         };

         setLiveLog(prev => [newAction, ...prev.slice(0, 7)]);
      });

      return () => {
         socket.disconnect();
      };
   }, []);

   const { data: usersRes } = useQuery({
      queryKey: ["adminAnalyticsUsers"],
      queryFn: () => fetchApi("/analytics/users"),
   });

   const { data: topTemplatesRes } = useQuery({
      queryKey: ["adminAnalyticsTopTemplates"],
      queryFn: () => fetchApi("/analytics/top-performing"),
   });

   const { data: funnelRes } = useQuery({
      queryKey: ["adminAnalyticsFunnel"],
      queryFn: () => fetchApi("/analytics/conversion"),
   });

   const { data: acquisitionRes } = useQuery({
      queryKey: ["adminAnalyticsAcquisition"],
      queryFn: () => fetchApi("/analytics/detailed-acquisition"),
   });

   const usersData = usersRes?.data?.map((d: any) => ({
      date: format(new Date(d.date), "MMM d"),
      signups: parseInt(d.signups)
   })) || [];

   const totalUsersCount = acquisitionRes?.data?.total_users || 0;
   const totalRecentSignups = usersData.reduce((acc: number, curr: any) => acc + curr.signups, 0);
   const growth = acquisitionRes?.data || { user_growth: 0 };

   const topTemplates = topTemplatesRes?.data || [];
   const funnelSteps = funnelRes?.data || [];

   return (
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
               <div>
                  <p className="sub-label mb-1 text-primary">Intelligence Hub</p>
                  <h1 className="section-header text-4xl font-black">Performance Dashboard</h1>
               </div>
               <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-border/50">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Real-time Sync Active</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
               </div>
            </header>

            {/* Core Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <OverviewCard
                  title="Total Users"
                  value={totalUsersCount.toLocaleString()}
                  change={`${growth.user_growth >= 0 ? '+' : ''}${growth.user_growth}%`}
                  icon={Users}
                  trend={growth.user_growth >= 0 ? "up" : "down"}
               />
               <OverviewCard
                  title="30D Signups"
                  value={totalRecentSignups.toLocaleString()}
                  change={`${growth.user_growth >= 0 ? '+' : ''}${growth.user_growth}%`}
                  icon={TrendingUp}
                  trend={growth.user_growth >= 0 ? "up" : "down"}
               />
               <OverviewCard
                  title="Top Template"
                  value={topTemplates[0]?.name || "N/A"}
                  change={`${topTemplates[0]?.users || 0} uses`}
                  icon={Layout}
                  trend="up"
               />
               <OverviewCard title="Live Pings" value={liveLog.length > 0 ? "Active" : "Idle"} change="Live" icon={Activity} trend="up" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
               {/* Primary Charts Section */}
               <div className="xl:col-span-2 space-y-8">
                  {/* User Signups Trajectory Chart */}
                  <div className="glass-card rounded-[2.5rem] p-8 border border-border relative overflow-hidden group">
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <h3 className="text-xl font-bold tracking-tight">User Acquisition Trajectory</h3>
                           <p className="text-xs text-muted-foreground font-semibold mt-1">Daily platform signups over the last 30 days</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
                              <Activity className="w-3 h-3" /> WebSocket Online
                           </div>
                        </div>
                     </div>

                     <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={usersData}>
                              <defs>
                                 <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6c41cf" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6c41cf" stopOpacity={0} />
                                 </linearGradient>
                              </defs>
                              <XAxis
                                 dataKey="date"
                                 axisLine={false}
                                 tickLine={false}
                                 tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                                 dy={10}
                              />
                              <YAxis
                                 axisLine={false}
                                 tickLine={false}
                                 tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                              />
                              <Tooltip
                                 content={<CustomTooltip />}
                              />
                              <Area
                                 type="monotone"
                                 dataKey="signups"
                                 stroke="#6c41cf"
                                 strokeWidth={4}
                                 fillOpacity={1}
                                 fill="url(#colorRev)"
                                 animationDuration={2000}
                              />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Grid for distribution and Acquisition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="glass-card rounded-[2rem] p-6 border border-border">
                        <h3 className="font-bold text-sm mb-6 flex items-center gap-2">
                           <Target className="w-4 h-4 text-primary" /> Conversion Funnel
                        </h3>
                        <div className="space-y-6">
                           {funnelSteps.length > 0 ? funnelSteps.map((step: any, i: number) => (
                              <FunnelStep key={i} label={step.label} value={step.value.toLocaleString()} percent={step.percent} color={step.color} />
                           )) : (
                              <p className="text-xs text-muted-foreground animate-pulse">Loading funnel intelligence...</p>
                           )}
                        </div>
                     </div>

                     <div className="glass-card rounded-[2rem] p-6 border border-border flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                           <div>
                              <h3 className="font-bold text-sm flex items-center gap-2">
                                 <Zap className="w-4 h-4 text-accent" /> Daily Signups
                              </h3>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">User acquisition distribution</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xl font-black text-foreground">{totalUsersCount.toLocaleString()}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total Registered</p>
                           </div>
                        </div>

                        <div className="h-[200px] mt-auto">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={usersData}>
                                 <Bar dataKey="signups" fill="#6c41cf" radius={[4, 4, 0, 0]}>
                                    {usersData.map((_entry: any, index: number) => (
                                       <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#6c41cf" : "#a37ff6"} />
                                    ))}
                                 </Bar>
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Sidebar Section */}
               <div className="space-y-8">
                  {/* Live Activity Feed */}
                  <div className="glass-card rounded-[2.5rem] p-6 border border-border h-fit">
                     <div className="flex items-center justify-between mb-6 px-2">
                        <h3 className="font-bold text-base flex items-center gap-2 italic">
                           <Activity className="w-4 h-4 text-emerald-500" /> Live Stream
                        </h3>
                        <span className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-tighter">Real-time</span>
                     </div>
                     <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                           {liveLog.length > 0 ? liveLog.map((log) => (
                              <motion.div
                                 key={log.id}
                                 initial={{ opacity: 0, x: 20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 exit={{ opacity: 0, x: -20 }}
                                 className="flex items-center gap-4 p-3 rounded-2xl bg-muted/50 border border-transparent hover:border-border transition-all"
                              >
                                 <div className={`p-2.5 rounded-xl bg-white shadow-sm ${log.color}`}>
                                    <log.icon className="w-3.5 h-3.5" />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-[11px] font-bold text-foreground leading-none capitalize">{log.action}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">{log.time}</p>
                                 </div>
                              </motion.div>
                           )) : (
                              <div className="py-8 text-center">
                                 <p className="text-xs text-muted-foreground font-bold tracking-widest animate-pulse">Waiting for pings...</p>
                              </div>
                           )}
                        </AnimatePresence>
                     </div>
                  </div>

                  {/* Popular Templates */}
                  <div className="glass-card rounded-[2.5rem] p-6 border border-border">
                     <h3 className="font-bold text-base mb-6 flex items-center gap-2 px-2">
                        <TrendingUp className="w-4 h-4 text-primary" /> Top Performing
                     </h3>
                     <div className="space-y-6">
                        {topTemplates.length > 0 ? topTemplates.map((template: any, i: number) => (
                           <div key={i} className="group cursor-pointer">
                              <div className="flex justify-between items-end mb-2">
                                 <div>
                                    <h4 className="text-xs font-bold text-foreground">{template.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                       <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground border-r border-border pr-3">
                                          <Eye className="w-3 h-3" /> {template.views.toLocaleString()}
                                       </span>
                                       <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                                          <Users className="w-3 h-3" /> {template.users.toLocaleString()}
                                       </span>
                                    </div>
                                 </div>
                                 <div className="text-[10px] font-black text-primary border border-primary/20 px-1.5 py-0.5 rounded-md">
                                    {Math.round((template.users / (template.views || 1)) * 100)}% CR
                                 </div>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                 <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (template.users / (topTemplates[0].users || 1)) * 100)}%` }}
                                    transition={{ duration: 1, delay: i * 0.2 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: template.color }}
                                 />
                              </div>
                           </div>
                        )) : (
                           <p className="text-xs text-muted-foreground animate-pulse">Reading template usage data...</p>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
   );
};

const OverviewCard = ({ title, value, change, icon: Icon, trend }: any) => (
   <div className="glass-card p-6 rounded-[2.25rem] border border-border relative overflow-hidden group hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between mb-4">
         <div className="p-3 rounded-2xl bg-primary/5 text-primary group-hover:scale-110 transition-transform">
            <Icon className="w-5 h-5" />
         </div>
         <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
            <ArrowUpRight className={`w-3 h-3 ${trend === 'down' ? 'rotate-90' : ''}`} />
            {change}
         </div>
      </div>
      <h3 className="text-3xl font-black tracking-tighter text-foreground mb-1">{value}</h3>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>

      {/* Decorative background shape */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
   </div>
);

const FunnelStep = ({ label, value, percent, color }: any) => (
   <div className="relative">
      <div className="flex justify-between items-center mb-1.5 px-1">
         <span className="text-[11px] font-bold text-foreground">{label}</span>
         <span className="text-[11px] font-black text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
         <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
         />
      </div>
   </div>
);

const CustomTooltip = ({ active, payload }: any) => {
   if (active && payload && payload.length) {
      return (
         <div className="glass-card p-4 rounded-2xl border border-white/50 shadow-2xl backdrop-blur-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{payload[0].payload.date}</p>
            <p className="text-lg font-black text-primary">₹{payload[0].value.toLocaleString()}</p>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50 text-[10px] font-bold text-emerald-600">
               <ArrowUpRight className="w-3 h-3" /> Performance Peak
            </div>
         </div>
      );
   }
   return null;
};

export default Analytics;
