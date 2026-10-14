import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Logo from "../../public/images/wishformoment-logo.webp";

const API_BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/admin/auth`;

const Login = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email");

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const response = await res.json()
      console.log({ response })
      if (!res.ok) throw new Error(response?.error?.message || "Failed to send code");
      setStep("otp");
      toast.success("Verification code sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return toast.error("Please enter a valid 6-digit code");

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Invalid code");

      if (data.user?.role !== "admin") {
        throw new Error("Unauthorized: You do not have administration privileges");
      }

      localStorage.setItem("adminToken", data.accessToken);
      toast.success("Welcome back, Admin!");
      window.location.href = "/"; // Force full reload to spin up Dashboard with new token
    } catch (err: any) {
      toast.error(err.message || "Failed to verify code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-3">
          <img src={Logo} alt="Logo" className="h-24 w-auto mb-2" />
          <p className="text-sm font-medium text-muted-foreground">Sign in to manage the ecosystem</p>
        </div>

        <div className="glass-card rounded-[2rem] p-8 shadow-2xl border border-border/50 bg-card/80 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOtp}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@wishformoment.com"
                    autoFocus
                    className="w-full px-5 py-3.5 rounded-xl bg-muted/50 text-base font-semibold outline-none focus:ring-2 focus:ring-primary/40 focus:bg-muted transition-all text-foreground"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl btn-primary font-bold disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue with Email"}
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Security Code</label>
                    <button
                      type="button"
                      onClick={() => { setStep("email"); setCode("") }}
                      className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                      Change Email
                    </button>
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                    className="w-full text-center tracking-[1em] px-5 py-4 rounded-xl bg-muted/50 text-2xl font-black outline-none focus:ring-2 focus:ring-primary/40 focus:bg-muted transition-all text-foreground font-mono"
                    disabled={isLoading}
                  />
                  <p className="text-xs font-semibold text-center mt-3 text-muted-foreground leading-relaxed">
                    We sent a secure code to<br />
                    <span className="text-foreground">{email}</span>
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || code.length < 6}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl btn-primary font-bold disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
                  {!isLoading && <CheckCircle2 className="w-5 h-5" />}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
