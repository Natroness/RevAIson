import { supabase } from "./supabaseClient";
import type { ServiceResult } from "@/types";
import type { Session, User } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateCredentials(
  email: string,
  password: string,
): string | null {
  if (!email || !email.trim()) return "Email is required";
  if (!EMAIL_REGEX.test(email.trim())) return "Enter a valid email address";
  if (!password) return "Password is required";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

export async function signUp(
  email: string,
  password: string,
): Promise<ServiceResult<{ user: User | null; session: Session | null }>> {
  const validationError = validateCredentials(email, password);
  if (validationError) return { data: null, error: validationError };

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) return { data: null, error: error.message };
  return { data: { user: data.user, session: data.session }, error: null };
}

export async function signIn(
  email: string,
  password: string,
): Promise<ServiceResult<{ user: User; session: Session }>> {
  const validationError = validateCredentials(email, password);
  if (validationError) return { data: null, error: validationError };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) return { data: null, error: error.message };
  if (!data.user || !data.session) {
    return { data: null, error: "Sign-in failed. Please try again." };
  }
  return { data: { user: data.user, session: data.session }, error: null };
}

export async function signOut(): Promise<ServiceResult<true>> {
  const { error } = await supabase.auth.signOut();
  if (error) return { data: null, error: error.message };
  return { data: true, error: null };
}

export async function getCurrentUser(): Promise<ServiceResult<User | null>> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error.message.toLowerCase().includes("session missing")) {
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }
  return { data: data.user ?? null, error: null };
}
