import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  org_unit: string;
  authMethod: "supabase" | "demo";
}

export type UserRole = "analyst" | "officer" | "command" | "admin";

// Demo role assignments for quick-login
const DEMO_ROLES: Record<string, { role: UserRole; name: string; org_unit: string }> = {
  "analyst@demo.local": { role: "analyst", name: "SOC Analyst", org_unit: "Security Operations" },
  "officer@demo.local": { role: "officer", name: "Security Officer", org_unit: "Security Operations" },
  "command@demo.local": { role: "command", name: "Command Staff", org_unit: "Executive" },
  "admin@demo.local": { role: "admin", name: "System Admin", org_unit: "IT Administration" },
};

const DEMO_PROFILE_KEY = "ai_kavach_demo_profile";

function loadDemoProfile(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(DEMO_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function saveDemoProfile(profile: UserProfile | null) {
  if (profile) {
    sessionStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));
  } else {
    sessionStorage.removeItem(DEMO_PROFILE_KEY);
  }
}

export function useAuth() {
  // Supabase session state
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);

  // Demo profile — persisted in sessionStorage
  const [demoProfile, setDemoProfile] = useState<UserProfile | null>(loadDemoProfile);

  // Listen for Supabase auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
      setSupabaseLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseSession(session);
      setSupabaseUser(session?.user ?? null);
      setSupabaseLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Determine auth state: Supabase session OR demo session
  const isSupabaseAuthenticated = !!supabaseSession;
  const isDemoAuthenticated = !!demoProfile;
  const isAuthenticated = isSupabaseAuthenticated || isDemoAuthenticated;
  const isLoading = supabaseLoading;

  // Build the effective profile
  let user: UserProfile | null = null;

  if (isSupabaseAuthenticated && supabaseUser) {
    // Supabase email/password user
    user = {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      name: supabaseUser.user_metadata?.name
        ?? supabaseUser.email?.split("@")[0]
        ?? "User",
      role: (supabaseUser.user_metadata?.role as UserRole) ?? "analyst",
      org_unit: (supabaseUser.user_metadata?.org_unit as string) ?? "Security Operations",
      authMethod: "supabase",
    };
  } else if (isDemoAuthenticated && demoProfile) {
    // Demo user (stored in sessionStorage)
    user = demoProfile;
  }

  // Supabase email/password sign in
  const signInEmail = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.session) throw new Error("Sign in failed. Please try again.");
    },
    [],
  );

  // Supabase email/password sign up
  const signUp = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "analyst",
            org_unit: "Security Operations",
          },
        },
      });
      if (error) throw error;
      if (data.user && !data.session) {
        // Email confirmation required
        return { confirmEmail: true };
      }
      return { confirmEmail: false };
    },
    [],
  );

  // Demo login — purely session-based, no backend call needed
  const signInDemo = useCallback(
    async (demoEmail: string) => {
      const roleInfo = DEMO_ROLES[demoEmail] ?? {
        role: "analyst" as UserRole,
        name: demoEmail.split("@")[0],
        org_unit: "Security Operations",
      };

      const profile: UserProfile = {
        id: `demo_${demoEmail}`,
        email: demoEmail,
        name: roleInfo.name,
        role: roleInfo.role,
        org_unit: roleInfo.org_unit,
        authMethod: "demo",
      };

      setDemoProfile(profile);
      saveDemoProfile(profile);
    },
    [],
  );

  // Sign out
  const handleSignOut = useCallback(async () => {
    // Sign out of Supabase (if signed in via Supabase)
    if (isSupabaseAuthenticated) {
      await supabase.auth.signOut();
      setSupabaseSession(null);
      setSupabaseUser(null);
    }

    // Clear demo session
    setDemoProfile(null);
    saveDemoProfile(null);
  }, [isSupabaseAuthenticated]);

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn: signInEmail,
    signInDemo,
    signUp,
    signOut: handleSignOut,
  };
}

export function useRoleAccess() {
  const { user } = useAuth();
  const role = user?.role;

  const isAnalyst = role === "analyst";
  const isOfficer = role === "officer";
  const isCommand = role === "command";
  const isAdmin = role === "admin";

  const canEdit = isAnalyst || isOfficer;
  const canViewSOC = isAnalyst || isOfficer || isCommand;
  const canViewCommand = isCommand;
  const canManageUsers = isAdmin;

  return { role, isAnalyst, isOfficer, isCommand, isAdmin, canEdit, canViewSOC, canViewCommand, canManageUsers };
}
