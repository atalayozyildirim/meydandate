import type { AuthSession } from "@/domain/repositories/AuthRepository";
import { supabase } from "../client";
import { mapSupabaseUser } from "../userMapper";
import { getMyProfile } from "./authSocialOps";

export const restoreUserSession = async (
  _token: string,
  _refreshToken?: string,
): Promise<AuthSession | null> => {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session || !data.session.user) {
    return null;
  }

  const userData = await getMyProfile();

  if (!userData) {
    return null;
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: mapSupabaseUser(userData),
  };
};

export const handleForgotPassword = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "ehlibyte://reset-password",
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const signOutUser = async (_token: string): Promise<void> => {
  await supabase.auth.signOut();
};

export const deleteUserAccount = async (token: string): Promise<void> => {
  const { error } = await supabase.functions.invoke("delete-account", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "Hesap silinemedi.");
  }

  await supabase.auth.signOut();
};
