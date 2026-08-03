import { createSpaceGate } from "@/lib/space-gate";

/**
 * Admin space gate: only platform staff (role `admin` or above in the hub) get
 * in, everyone else gets a 404. The admin navigation comes from AdminSpace.
 */
export default createSpaceGate("admin");
