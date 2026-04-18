"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Lock, Save, User, UserCircle, Palette, Store, GripHorizontal, ShieldCheck, Pencil, Upload, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAdminConfig, saveAdminConfig, type AdminSystemConfig, DEFAULT_CONFIG } from "@/services/firebase/admin-config";
import { getFirebaseAuth } from "@/services/firebase/client";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useAuthStore } from "@/store/auth-store";
import { uploadAdminImage } from "@/services/firebase/storage";

export const THEME_COLORS = [
  { name: "Obsidian Base", value: "#1c1917" },
  { name: "Pastel Sage", value: "#b2ccb3" },
  { name: "Soft Lavender", value: "#bbaeed" },
  { name: "Powder Blue", value: "#9fb9d6" },
  { name: "Dusty Peach", value: "#dfa79b" },
  { name: "Warm Mocha", value: "#c2ab99" },
];

const FONT_FAMILIES = [
  { name: "Inter (Modern Sans)", value: "Inter, sans-serif" },
  { name: "Roboto (Clean Sans)", value: "Roboto, sans-serif" },
  { name: "Merriweather (Classic Serif)", value: "Merriweather, serif" },
  { name: "Outfit (Geometric)", value: "Outfit, sans-serif" },
  { name: "Fira Code (Monospace Space)", value: "'Fira Code', monospace" }
];

export function ProfileView() {
  const user = useAuthStore((state) => state.user);
  
  const [config, setConfig] = useState<AdminSystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Reset State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const data = await getAdminConfig();
      setConfig(data);
    } catch (e) {
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      await saveAdminConfig(config);
      toast.success("System configurations updated.");
    } catch (e) {
      toast.error("Failed to save configurations.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleImageUpload(file?: File) {
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadAdminImage(file);
      setConfig((c) => ({ ...c, logoUrl: url }));
      toast.success("Logo uploaded successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload Custom Logo.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleUpdatePassword() {
    if (!oldPassword || !newPassword) {
      toast.error("Provide both current and new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    if (oldPassword === newPassword) {
      toast.error("New password must be different from the current password.");
      return;
    }
    setUpdatingPassword(true);
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("No active session found.");
      }

      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      
      // Update local storage bypass credentials
      if (typeof window !== "undefined" && currentUser.email) {
        localStorage.setItem("pos_local_auth", btoa(`${currentUser.email}:::${newPassword}`));
      }
      
      toast.success("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
        toast.error("Incorrect current password.");
      } else if (error?.code === "auth/weak-password") {
        toast.error("The new password is too weak.");
      } else {
        toast.error(error?.message || "Failed to update password.");
      }
    } finally {
      setUpdatingPassword(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm font-medium text-stone-500">Loading profile data...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-stone-900">System Preferences</h1>
        <p className="mt-1 text-sm font-medium text-stone-500">Configure business details, aesthetics, and administrative access.</p>
      </div>

      <div className="space-y-6">
        {/* Brand Identity */}
        <section className="space-y-4">
          <div>
             <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
               <Store className="h-4 w-4 text-stone-400" /> Brand Identity
             </h2>
             <p className="text-xs font-medium text-stone-500 mt-0.5">Define what your staff and customers see.</p>
          </div>
          <Card className="p-4 md:p-6 border-stone-100 shadow-sm rounded-2xl bg-white flex flex-col md:flex-row gap-6 md:gap-8">
            <div className="shrink-0 flex justify-center md:justify-start">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => void handleImageUpload(e.target.files?.[0])} />
              <button disabled={uploadingImage} onClick={() => fileInputRef.current?.click()} className="group relative flex h-[100px] w-[100px] overflow-hidden rounded-[20px] bg-stone-50 border border-stone-100 transition-all hover:border-stone-300">
                {config.logoUrl ? (
                  <>
                    <img src={config.logoUrl} alt="Logo" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Pencil className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-stone-400 group-hover:text-stone-600">
                    <Upload className="mb-1 h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center">Add Logo</span>
                  </div>
                )}
              </button>
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-1.5">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Shop Name</label>
                 <Input value={config.shopName} onChange={(e) => setConfig({ ...config, shopName: e.target.value })} className="h-11 rounded-xl border-stone-200" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Administrator Name</label>
                 <Input value={config.adminName} onChange={(e) => setConfig({ ...config, adminName: e.target.value })} className="h-11 rounded-xl border-stone-200" />
              </div>
            </div>
          </Card>
        </section>

        {/* Security Layers */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
            <div>
               <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                 <ShieldCheck className="h-4 w-4 text-stone-400" /> Security Layers
               </h2>
               <p className="text-xs font-medium text-stone-500 mt-0.5">Physical backend bypass controls.</p>
            </div>
            <Button onClick={handleSaveConfig} disabled={savingConfig} className="h-10 md:h-8 rounded-xl md:rounded-lg px-4 text-xs font-bold w-full md:w-auto">Save PIN</Button>
          </div>
          <Card className="p-4 md:p-6 border-stone-100 shadow-sm rounded-2xl bg-white space-y-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Recovery PIN Code</label>
            <div className="flex gap-2 w-full max-w-sm">
                 {Array.from({ length: 6 }).map((_, i) => (
                   <Input 
                     key={i} id={`pin-${i}`} type="text" inputMode="numeric"
                     value={(config.secondaryPin || "")[i] || ""}
                     onChange={(e) => {
                       const val = e.target.value;
                       if (val !== "" && !/^\d*$/.test(val)) return;
                       let arr = (config.secondaryPin || "").split("");
                       arr[i] = val.slice(-1);
                       const newPinStr = arr.join("").slice(0, 6);
                       setConfig({ ...config, secondaryPin: newPinStr });
                       if (val && i < 5) document.getElementById(`pin-${i + 1}`)?.focus();
                     }}
                     onKeyDown={(e) => {
                       if (e.key === "Backspace" && !(config.secondaryPin || "")[i] && i > 0) document.getElementById(`pin-${i - 1}`)?.focus();
                     }}
                     className="h-14 flex-1 text-center text-xl font-bold bg-stone-50 border-stone-200 focus:bg-white rounded-xl"
                   />
                 ))}
            </div>
            <p className="text-xs text-stone-500 font-medium leading-relaxed">
              Functions as an alternative login and manual system override code if sessions expire abruptly.
            </p>
          </Card>
        </section>

        {/* System Aesthetics */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
             <div>
               <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                 <Palette className="h-4 w-4 text-stone-400" /> System Aesthetics
               </h2>
               <p className="text-xs font-medium text-stone-500 mt-0.5">Live layout and styling variations.</p>
             </div>
             <Button onClick={() => setConfig(c => ({...c, primaryColor: DEFAULT_CONFIG.primaryColor, fontFamily: DEFAULT_CONFIG.fontFamily}))} variant="outline" className="h-10 md:h-8 rounded-xl md:rounded-lg px-4 text-xs font-bold text-stone-600 w-full md:w-auto">
               Reset Defaults
             </Button>
          </div>
          <Card className="p-4 md:p-6 border-stone-100 shadow-sm rounded-2xl bg-white space-y-6">
            <div className="space-y-2.5">
               <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Interface Motif</label>
               <div className="flex flex-wrap gap-2">
                 {THEME_COLORS.map((color) => (
                   <button key={color.value} onClick={() => setConfig({ ...config, primaryColor: color.value })} className={`flex gap-2 h-10 items-center justify-center rounded-xl border px-4 transition-all ${config.primaryColor === color.value ? "border-stone-900 bg-stone-900 text-white shadow-md font-bold" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 font-medium"}`}>
                     <span className="h-3.5 w-3.5 rounded-full border border-stone-200" style={{ backgroundColor: color.value }} />
                     {color.name}
                   </button>
                 ))}
               </div>
            </div>
            <div className="space-y-2.5">
               <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Typography Suite</label>
               <div className="flex flex-wrap gap-2">
                 {FONT_FAMILIES.map((font) => (
                   <button key={font.value} onClick={() => setConfig({ ...config, fontFamily: font.value })} style={{ fontFamily: font.value }} className={`flex h-10 items-center justify-center rounded-xl border px-4 transition-all ${config.fontFamily === font.value ? "border-stone-900 bg-stone-900 text-white shadow-md font-bold" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 font-medium"}`}>
                     {font.name}
                   </button>
                 ))}
               </div>
            </div>
            <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full h-10 rounded-xl text-xs font-bold">
               Save Theme Settings
            </Button>
          </Card>
        </section>

        {/* Account Credentials */}
        <section className="space-y-4">
          <div>
             <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
               <Lock className="h-4 w-4 text-stone-400" /> Account Credentials
             </h2>
             <p className="text-xs font-medium text-stone-500 mt-0.5">Firebase master authentication bindings.</p>
          </div>
          <Card className="p-4 md:p-6 border-stone-100 shadow-sm rounded-2xl bg-white space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
               <div className="w-full space-y-1.5">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Current Password</label>
                 <div className="relative">
                   <Input type={showOldPassword ? "text" : "password"} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="h-11 rounded-xl border-stone-200 pr-10" />
                   <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                     {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                   </button>
                 </div>
               </div>
               <div className="w-full space-y-1.5">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">New Password</label>
                 <div className="relative">
                   <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11 rounded-xl border-stone-200 pr-10" />
                   <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                     {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                   </button>
                 </div>
               </div>
               <div className="w-full space-y-1.5">
                 <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600">Confirm Password</label>
                 <Input type={showNewPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 rounded-xl border-stone-200" />
               </div>
               <Button onClick={handleUpdatePassword} disabled={updatingPassword} variant="default" className="h-11 rounded-xl px-6 w-full md:w-auto font-bold bg-stone-900 text-white shrink-0">
                 {updatingPassword ? "Updating..." : "Update"}
               </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
