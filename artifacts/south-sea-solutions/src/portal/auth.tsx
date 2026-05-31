import { type ReactNode } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { AuthContext } from "./auth-hooks";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 30_000 },
  });

  return (
    <AuthContext.Provider value={{ user: data ?? null, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
