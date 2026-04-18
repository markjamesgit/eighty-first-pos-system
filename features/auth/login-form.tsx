"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginAdmin } from "@/services/firebase/auth";
import { getAdminConfig } from "@/services/firebase/admin-config";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryPin, setRecoveryPin] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await loginAdmin(email, password);
      // Store encoded credentials for local machine PIN bypass
      if (typeof window !== "undefined") {
        localStorage.setItem("pos_local_auth", btoa(`${email}:::${password}`));
      }
      toast.success("Welcome back.");
      router.replace("/dashboard");
    } catch (error: any) {
      if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
        toast.error("Incorrect email or password.");
      } else {
        toast.error(error?.message || "Unable to sign in.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePinVerification() {
    if (recoveryPin.length !== 6) return;
    setVerifyingPin(true);
    try {
      const config = await getAdminConfig();
      if (config.secondaryPin === recoveryPin && config.secondaryPin) {
        let authStored = "";
        if (typeof window !== "undefined") {
          authStored = localStorage.getItem("pos_local_auth") || "";
        }

        if (!authStored) {
          toast.error("No linked device credentials found. Please login normally first.");
          setIsRecovering(false);
          return;
        }

        try {
          const decoded = atob(authStored);
          const [savedEmail, savedPassword] = decoded.split(":::");
          toast.info("PIN Verified. Authenticating bypass...");
          await loginAdmin(savedEmail, savedPassword);
          toast.success("Override successful.");
          router.replace("/dashboard");
        } catch (e) {
          toast.error("Linked credentials expired. Please login normally.");
          setIsRecovering(false);
        }
      } else {
        toast.error("Incorrect recovery PIN.");
      }
    } catch (e: any) {
      if (e?.code === "permission-denied") {
        toast.error("Firestore Rules strictly block unauthorized access. An Admin session is required to fetch PINs.");
      } else {
        toast.error(e?.message || "Failed to verify PIN. System is offline.");
      }
    } finally {
      setVerifyingPin(false);
    }
  }

  if (isRecovering) {
    return (
      <Card className="w-full max-w-md shadow-lg border-stone-100">
        <CardHeader>
          <CardTitle>Recovery Interface</CardTitle>
          <CardDescription>
            Enter your 6-digit secondary backup authorization PIN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 justify-between w-full">
              {Array.from({ length: 6 }).map((_, i) => (
                <Input
                  key={i} id={`login-pin-${i}`} type="text" inputMode="numeric"
                  value={recoveryPin[i] || ""}
                  disabled={verifyingPin}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "" && !/^\d*$/.test(val)) return;
                    let arr = recoveryPin.split("");
                    arr[i] = val.slice(-1);
                    const newPin = arr.join("").slice(0, 6);
                    setRecoveryPin(newPin);
                    if (val && i < 5) document.getElementById(`login-pin-${i + 1}`)?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !recoveryPin[i] && i > 0) document.getElementById(`login-pin-${i - 1}`)?.focus();
                  }}
                  className="h-14 w-12 text-center text-xl font-bold border-stone-200 focus:border-stone-900 bg-stone-50 focus:bg-white transition-all rounded-xl shadow-sm"
                />
              ))}
            </div>

            <Button onClick={handlePinVerification} disabled={recoveryPin.length !== 6 || verifyingPin} className="w-full h-12 rounded-xl font-bold bg-stone-900 text-white">
              {verifyingPin ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : null}
              Authorize Override
            </Button>

            <button
              onClick={() => setIsRecovering(false)}
              className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors w-full text-center mt-2"
            >
              Back to safe login
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle>Admin Login</CardTitle>
        <CardDescription>
          Enter your authorized credentials to securely access the point of sale.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@coffee.com"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-stone-700" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                onClick={() => setIsRecovering(true)}
                className="text-[11px] font-bold text-stone-500 hover:text-stone-800 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
