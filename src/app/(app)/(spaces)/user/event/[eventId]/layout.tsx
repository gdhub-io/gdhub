import { createSpaceGate } from "@/lib/space-gate";

/**
 * Event space gate: the creator, approved participants and platform staff get
 * in. A pending application does not — applying happens on the public page.
 */
export default createSpaceGate("event", { param: "eventId" });
