import { and, eq, inArray } from "drizzle-orm";
import { db, vehiclesTable, fleetsTable, driversTable, type Vehicle, type Driver } from "@workspace/db";

// Returns the vehicle if it belongs to the org (its fleet is owned by the org),
// otherwise null. Used to org-scope mutations that take a raw vehicleId.
export async function vehicleInOrg(vehicleId: string, orgId: string): Promise<Vehicle | null> {
  const [row] = await db
    .select({ vehicle: vehiclesTable })
    .from(vehiclesTable)
    .innerJoin(fleetsTable, eq(vehiclesTable.fleetId, fleetsTable.id))
    .where(and(eq(vehiclesTable.id, vehicleId), eq(fleetsTable.orgId, orgId)));
  return row?.vehicle ?? null;
}

export async function driverInOrg(driverId: string, orgId: string): Promise<Driver | null> {
  const [row] = await db
    .select()
    .from(driversTable)
    .where(and(eq(driversTable.id, driverId), eq(driversTable.orgId, orgId)));
  return row ?? null;
}

// Map of vehicleId -> reg for every vehicle in the org.
export async function orgVehicleRegs(orgId: string): Promise<Map<string, string>> {
  const fleets = await db.select().from(fleetsTable).where(eq(fleetsTable.orgId, orgId));
  const fleetIds = fleets.map((f) => f.id);
  const vehicles = fleetIds.length
    ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.fleetId, fleetIds))
    : [];
  return new Map(vehicles.map((v) => [v.id, v.reg]));
}
