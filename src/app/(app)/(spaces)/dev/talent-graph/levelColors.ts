import { brand } from "@/config/design";
import type { SkillLevel } from "@/config/prisma-enums";

// Ordinal scale, so one hue light → dark rather than five unrelated hues.
export const LEVEL_COLORS: Record<SkillLevel, string> = {
	Novice: brand[200],
	Beginner: brand[300],
	Skillful: brand[500],
	Experienced: brand[700],
	Expert: brand[900],
};
