import { createSpaceGate } from "@/lib/space-gate";

/**
 * Course space gate: the author, teachers and enrolled students get in.
 */
export default createSpaceGate("course", { param: "courseId" });
