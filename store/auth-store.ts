"use client";

import { create } from "zustand";
import { getCurrentAdminProfile, subscribeToAuthState } from "@/services/firebase/auth";
import type { AppUser } from "@/lib/types/domain";

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => () => void;
  setUser: (user: AppUser | null) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
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
        const profile = await getCurrentAdminProfile(firebaseUser.uid);
        set({
          user:
            profile ??
            ({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              displayName: firebaseUser.displayName ?? "Admin",
              role: "admin",
            } satisfies AppUser),
          loading: false,
        });
      } catch {
        set({ user: null, loading: false });
      }
    });

    return unsubscribe;
  },
  setUser: (user) => set({ user }),
}));
