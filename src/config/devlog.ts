// ProjectReport has no "system" flag in the schema, so generated posts are matched by content.
export const SYSTEM_DEVLOG_CONTENTS = [
	"Registration of the project on the service",
] as const;

export const PROJECT_REGISTERED_DEVLOG_CONTENT = SYSTEM_DEVLOG_CONTENTS[0];

/** Prisma filter that keeps generated posts out of feeds. */
export const nonSystemDevlogFilter = {
	content: { notIn: [...SYSTEM_DEVLOG_CONTENTS] },
};
