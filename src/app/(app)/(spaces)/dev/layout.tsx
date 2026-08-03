import { createSpaceGate } from "@/lib/space-gate";

/**
 * Dev tools gate: the space does not exist in production at all, and outside it
 * requires platform staff (role `admin` or above in the hub).
 */
export default createSpaceGate("dev");
