/**
 * Support Intake — Router
 *
 * Maps a triaged request type to the person who should get the call/notify.
 * The fallback chain ALWAYS terminates at the dealer. If even dealer_phone is
 * null, the request is still created (routed_to_phone: null) and surfaces on the
 * dashboard — a request is never dropped for lack of a routing target.
 */

import type { RequestType } from './triage.js';

export type RouteTarget = 'MECHANIC' | 'TECHNICIAN' | 'DEALER';

/** The subset of SupportRouting the router needs. */
export interface RoutingConfig {
  mechanic_phone?: string | null;
  technician_phone?: string | null;
  dealer_phone?: string | null;
}

export interface RouteResult {
  target: RouteTarget;
  phone: string | null;
}

export function resolveRoute(type: RequestType, routing: RoutingConfig | null | undefined): RouteResult {
  const r = routing ?? {};
  const dealerPhone = r.dealer_phone ?? null;

  switch (type) {
    case 'SERVICE':
    case 'REPAIR':
      // Mechanic handles the tractor. Fall back to the dealer if unset.
      return { target: 'MECHANIC', phone: r.mechanic_phone ?? dealerPhone };
    case 'OTHER':
      // Technician handles papers / RTO / finance / parts. Fall back to dealer.
      return { target: 'TECHNICIAN', phone: r.technician_phone ?? dealerPhone };
    case 'UNSURE':
    default:
      // Can't tell → straight to the dealer to decide.
      return { target: 'DEALER', phone: dealerPhone };
  }
}
