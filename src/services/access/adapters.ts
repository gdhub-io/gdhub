import type { SpaceType } from "@/config/spaces";
import { advisorSpaceAdapter } from "@/repositories/advisor/space";
import { courseSpaceAdapter } from "@/repositories/course/space";
import { eventSpaceAdapter } from "@/repositories/event/space";
import { hubSpaceAdapter } from "@/repositories/hub/space";
import { projectSpaceAdapter } from "@/repositories/project/space";
import { scoutSpaceAdapter } from "@/repositories/scout/space";
import type { SpaceAdapter } from "./types";

/**
 * Adapters by space type — an explicit map rather than side-effecting
 * `registerSpaceAdapter()` calls: an import kept only for its side effect is
 * easy to lose in bundling, and a map is trivially testable.
 *
 * `admin` and `dev` have no adapter: their role is inherited from the hub.
 */
export const SPACE_ADAPTERS: Partial<Record<SpaceType, SpaceAdapter>> = {
	hub: hubSpaceAdapter,
	project: projectSpaceAdapter,
	event: eventSpaceAdapter,
	course: courseSpaceAdapter,
	scout: scoutSpaceAdapter,
	advisor: advisorSpaceAdapter,
};
