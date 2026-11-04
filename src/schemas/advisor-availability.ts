import { z } from "zod";
import { AdvisorAvailabilityStatus } from "@/config/prisma-enums";

const minute = z
	.number()
	.int()
	.min(0)
	.max(24 * 60);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const RuleSchema = z
	.object({
		monthFrom: day.nullable(),
		monthTo: day.nullable(),
		weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
		ranges: z
			.array(
				z
					.object({ from: minute, to: minute })
					.refine((range) => range.to > range.from, {
						message: "A range must end after it starts",
					}),
			)
			.min(1)
			.max(6),
		forConsultations: z.boolean(),
		forCheckpoints: z.boolean(),
	})
	.refine((rule) => (rule.monthFrom === null) === (rule.monthTo === null), {
		message: "Months come as a pair",
	})
	.refine(
		(rule) =>
			!rule.monthFrom || !rule.monthTo || rule.monthFrom <= rule.monthTo,
		{ message: "A period must end after it starts" },
	)
	.refine((rule) => rule.forConsultations || rule.forCheckpoints, {
		message: "A period is open for something",
	});

export const AvailabilitySchema = z.object({
	timeZone: z
		.string()
		.min(1)
		.refine(
			(zone) => {
				try {
					new Intl.DateTimeFormat("en", { timeZone: zone });
					return true;
				} catch {
					return false;
				}
			},
			{ message: "Unknown time zone" },
		),
	status: z.nativeEnum(AdvisorAvailabilityStatus),
	awayUntil: z.coerce.date().nullable(),
	consultationsPerMonth: z.number().int().min(1).max(100).nullable(),
	rules: z.array(RuleSchema).max(40),
});

export type AvailabilityBody = z.infer<typeof AvailabilitySchema>;

export const FirstCallsQuerySchema = z.object({ from: day, to: day });
