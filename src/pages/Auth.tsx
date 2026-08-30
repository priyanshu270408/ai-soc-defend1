import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Loader2, Mail, KeyRound, Eye, EyeOff } from "lucide-react";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

// Demo quick-login buttons for different roles
function DemoLoginButtons({ onDemoLogin, disabled }: { onDemoLogin: (email: string) => void; disabled?: boolean }) {
  return (
    <div className="mt-4 space-y-2">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Quick Demo Access</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { role: "Analyst", email: "analyst@demo.local", color: "oklch(0.72 0.15 185)" },
          { role: "Officer", email: "officer@demo.local", color: "oklch(0.72 0.16 55)" },
          { role: "Command", email: "command@demo.local", color: "oklch(0.70 0.14 220)" },
          { role: "Admin", email: "admin@demo.local", color: "oklch(0.62 0.22 25)" },
        ].map((d) => (
          <button
            key={d.role}
            type="button"
            onClick={() => onDemoLogin(d.email)}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-accent/30 px-3 py-2 text-left hover:bg-accent/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-xs font-medium text-foreground">{d.role}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    props.redirectAfterAuth
  );
  const { signIn, signUp, signInDemo } = useAuth();

  const supabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle email/password sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await signIn(email, password);
      navigate(redirect);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed. Please try again.";
      // Friendly error messages
      if (message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please check your credentials.");
      } else if (message.includes("Email not confirmed")) {
        setError("Please confirm your email before signing in.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email/password sign up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await signUp(email, password);
      if (result.confirmEmail) {
        setSuccess("Account created! Please check your email to confirm your account, then sign in.");
        setIsSignUp(false);
      } else {
        // Auto-signed in after signup
        navigate(redirect);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed. Please try again.";
      if (message.includes("already registered")) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (message.includes("Password should")) {
        setError("Password is too weak. Use at least 6 characters with a mix of letters and numbers.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login
  const handleDemoLogin = async (demoEmail: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await signInDemo(demoEmail);
      navigate(redirect);
    } catch {
      setError("Demo login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(oklch(1 0 0 / 30%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 30%) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">AI Kavach</span>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">SOC Console</p>
            </div>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">
              {isSignUp ? "Create Account" : "Sign In"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isSignUp
                ? "Create an account to access the SOC console"
                : "Enter your email and password to access the SOC console"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-3">
              {/* Email field */}
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  className="pl-9 h-9 text-sm bg-background/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || !supabaseConfigured}
                  autoFocus
                />
              </div>

              {/* Password field */}
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="pl-9 pr-9 h-9 text-sm bg-background/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || !supabaseConfigured}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-md px-3 py-2">{error}</p>
              )}
              {success && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 rounded-md px-3 py-2">{success}</p>
              )}

              <Button
                type="submit"
                className="w-full h-9 text-sm"
                disabled={isLoading || !supabaseConfigured}
                title={!supabaseConfigured ? "Configure Supabase credentials to enable" : ""}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="size-4 mr-2" />
                )}
                {!supabaseConfigured ? "Supabase Not Configured" : isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>

            {!supabaseConfigured && (
              <p className="text-[11px] text-amber-400/80 bg-amber-500/10 rounded-md px-3 py-2 mt-2">
                Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable email/password sign in. Use the demo buttons below to try the app.
              </p>
            )}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>

            {/* Demo buttons */}
            <DemoLoginButtons onDemoLogin={handleDemoLogin} disabled={isLoading} />
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
          AI Kavach SOC · All data is synthetic
        </p>
      </div>
    </div>
  );
}
