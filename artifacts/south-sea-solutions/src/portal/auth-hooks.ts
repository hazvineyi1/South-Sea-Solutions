import { createContext, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  useLogin as useLoginMutation,
  useLogout as useLogoutMutation,
  type AuthUser,
} from "@workspace/api-client-react";

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useLoginMutation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useLogoutMutation({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(getGetMeQueryKey(), null);
        queryClient.clear();
      },
    },
  });
}
