import { Loader2 } from "lucide-react";
import { useGetDriverRecord, getGetDriverRecordQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/portal/auth-hooks";
import { PortalLayout } from "@/portal/PortalLayout";
import { DriverRecordView } from "./driver-record";

export default function DriverHomePage() {
  const { user } = useAuth();
  const driverId = user?.driverId ?? "";
  const { data, isLoading, isError } = useGetDriverRecord(driverId, {
    query: {
      queryKey: getGetDriverRecordQueryKey(driverId),
      enabled: Boolean(driverId),
      retry: false,
    },
  });

  return (
    <PortalLayout>
      {!driverId ? (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          Your account is not linked to a driver profile yet.
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          Your record could not be loaded.
        </div>
      ) : (
        <DriverRecordView record={data} />
      )}
    </PortalLayout>
  );
}
