/** Graph-space width of a stage band of weight 1, and the gap from the centre to the first ring. */
export const TRAILS_RING_STEP = 110;

/**
 * How long each default-workflow stage usually lasts, relative to the others;
 * a stage's band on the graph is this wide. Keyed by lower-case stage name;
 * a stage not listed weighs 1.
 */
export const TRAILS_STAGE_WEIGHTS: Record<string, number> = {
	introduction: 0.5,
	ideation: 0.7,
	concepting: 1,
	prototyping: 1.5,
	"preparing a demo version": 2.2,
	"taking and analyzing metrics": 1,
	"preparing a release version": 3,
	support: 1.5,
	"project completion": 0.5,
};

/** Widest sideways sway of a path, in radians; narrower when projects crowd the circle. */
export const TRAILS_MAX_SWAY = 0.35;

/** Spacing of the faint dots that draw each ring. */
export const TRAILS_RING_DOT_SPACING = 18;

/** A project in Project Completion within this many days of its creation was clicked there, and stays off the graph. */
export const TRAILS_RUSHED_TO_COMPLETION_DAYS = 1;

/** Only projects with any activity in this many days make the graph. */
export const TRAILS_WINDOW_DAYS = 365;

/** Link width of the lowest- and highest-scored road, in px. */
export const TRAILS_LINK_WIDTH = { min: 1, max: 4 };

/** How long the signal takes to run from where a checkpoint is now to its end. */
export const TRAILS_SIGNAL_PERIOD_MS = 1600;

/** How long the paths take to grow out of the centre when the page opens. */
export const TRAILS_GROW_MS = 1400;
