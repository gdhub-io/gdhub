import { createSpaceGate } from "@/lib/space-gate";

/**
 * Project space gate: author, `Founder` and hired team members get in, everyone
 * else gets a 404 before any client code mounts. Auth and the app chrome come
 * from the parent (app) layout; the project tabs come from ProjectSpace.
 */
export default createSpaceGate("project", { param: "slug" });
