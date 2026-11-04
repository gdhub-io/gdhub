/** How long the scoped search key handed to the hub members page stays valid. */
export const TALENT_POOL_KEY_TTL_SECONDS = 12 * 60 * 60;

/** The specialist fields the talent-pool cards show; the scoped key returns nothing else. */
export const TALENT_POOL_FIELDS = [
	"id",
	"name",
	"direction",
	"level",
	"specialization",
	"skills",
	"country",
	"city",
	"timeForWorkMin",
	"timeForWorkMax",
	"createdAt",
];
