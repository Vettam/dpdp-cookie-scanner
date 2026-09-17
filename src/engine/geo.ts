import type { Observation, RequestObservation } from "../types.js";
import { lookupCountry, type GeoDb } from "../geo/lookup.js";

/**
 * Stamp request observations with destination_country from IPs already
 * observed on the wire (CDP remoteIPAddress). Offline lookup only.
 */
export function applyDestinationCountries(
  observations: Observation[],
  ipByHost: Map<string, string>,
  db: GeoDb,
): void {
  for (const o of observations) {
    if (o.type !== "request") continue;
    const req = o as RequestObservation;
    if (req.destination_country) continue;
    const ip = ipByHost.get(req.host);
    if (!ip) continue;
    req.destination_country = lookupCountry(ip, db);
  }
}
