import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, ChefHat, Utensils, ClipboardCheck, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Login — MessMate" }],
  }),
  component: LoginPage,
});

const features = [
  { icon: ClipboardCheck, text: "Daily attendance tracking for breakfast, lunch & dinner" },
  { icon: Utensils,       text: "Monthly meal summary per member" },
  { icon: BarChart3,      text: "Expense management & inventory control" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created successfully! You can now log in.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem("isLoggedIn", "true");
        toast.success("Welcome to MessMate!");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left: Brand Panel ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] lg:flex-col lg:justify-between bg-gradient-to-br from-[#13112B] via-[#1a1848] to-[#0f0e2a] p-10 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-violet-600/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-900/50">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">MessMate</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              Your digital mess<br />logbook, simplified.
            </h1>
            <p className="mt-3 text-indigo-200/70 text-[15px] leading-relaxed">
              Manage attendance, track expenses, and monitor inventory — all in one clean, powerful dashboard.
            </p>
          </div>
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-indigo-500/20 border border-indigo-500/30">
                  <f.icon className="h-3.5 w-3.5 text-indigo-300" />
                </div>
                <span className="text-[13px] text-indigo-100/70 leading-relaxed">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[12px] text-indigo-200/30">
            © {new Date().getFullYear()} MessMate. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right: Form Panel ─────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12 sm:px-8">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600">
            <ChefHat className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <span className="text-lg font-bold text-foreground">MessMate</span>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              {isSignUp
                ? "Register your admin credentials to get started"
                : "Sign in to your MessMate dashboard"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@messmate.app"
                  className="h-11 pl-10 rounded-xl border-input bg-background text-[14px] placeholder:text-muted-foreground focus-visible:ring-primary focus-visible:border-primary transition-colors text-foreground"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pl-10 pr-11 rounded-xl border-input bg-background text-[14px] placeholder:text-muted-foreground focus-visible:ring-primary focus-visible:border-primary transition-colors text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-semibold shadow-sm shadow-indigo-600/20 transition-all duration-200 hover:shadow-indigo-600/30 hover:shadow-md mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <span className="text-[13px] text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
