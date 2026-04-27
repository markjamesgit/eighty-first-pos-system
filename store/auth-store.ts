"use client";

import { create } from "zustand";
import { getCurrentAdminProfile, subscribeToAuthState } from "@/services/firebase/auth";
import type { AppUser, UserRole } from "@/lib/types/domain";

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => () => void;
  setUser: (user: AppUser | null) => void;
  setMasquerade: (clientId: string | null) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  setMasquerade: (clientId) => {
    const user = get().user;
    if (user && user.role === "super_admin") {
      set({ user: { ...user, masqueradeClientId: clientId } });
    }
  },
  initialize: () => {
    if (get().initialized) {
      return () => undefined;
    }

    set({ initialized: true, loading: true });

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, loading: false });
        return;
      }

      try {
        const [profile, tokenResult] = await Promise.all([
          getCurrentAdminProfile(firebaseUser.uid),
          firebaseUser.getIdTokenResult()
        ]);
        
        const finalRole = (roleFromClaims || profile?.role) as UserRole | undefined;

        set({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            displayName: profile?.displayName ?? firebaseUser.displayName ?? "User",
            role: finalRole || "cashier", // Default to lowest permission instead of admin
            clientId: clientIdFromClaims || (profile as AppUser | null)?.clientId,
            createdAt: profile?.createdAt,
            lastLoginAt: profile?.lastLoginAt,
          },
          loading: false,
        });
      } catch (err) {
        // Fallback to basic info from Firebase Auth
        const tokenResult = await firebaseUser.getIdTokenResult();
        const roleFromClaims = tokenResult.claims.role as string | undefined;
        const clientIdFromClaims = tokenResult.claims.clientId as string | undefined;

        set({
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            displayName: firebaseUser.displayName ?? "User",
            role: (roleFromClaims as UserRole) || "cashier",
            clientId: clientIdFromClaims,
          },
          loading: false,
        });
      }
    });

    return unsubscribe;
  },
  setUser: (user) => set({ user }),
}));
