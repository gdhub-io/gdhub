import { createPermissionGate } from "@/lib/space-gate";

/**
 * Live reports. The proxy used to let in anyone holding any `UserRole`, which
 * after onboarding was everybody; the permission is the real rule, and the live
 * room is not rolled out to members yet (docs/roles-and-permissions.md §3.7).
 */
export default createPermissionGate("hub.live_room.use");
