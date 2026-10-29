import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	getAvailability,
	saveAvailability,
} from "@/repositories/advisor/availability";
import {
	type AvailabilityBody,
	AvailabilitySchema,
} from "@/schemas/advisor-availability";

/**
 * The asker's own hours (GDHUB-84). Scoped by the session alone: nobody edits
 * another advisor's hours, and reading them for booking goes through the
 * curator's free-calls route instead.
 */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const advisor = user as SessionUser | undefined;
	if (!advisor) return apiError.unauthorized();

	return json(await getAvailability(advisor.id));
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withValidation(AvailabilitySchema),
)(async (_req, _ctx, { user, body }) => {
	const advisor = user as SessionUser | undefined;
	if (!advisor) return apiError.unauthorized();

	const result = await saveAvailability(advisor.id, body as AvailabilityBody);

	// Booked checkpoint calls outside the new hours: the change waits until
	// each is moved, and the list says which.
	if (!result.ok) return json(result, { status: 409 });

	return json(await getAvailability(advisor.id));
});
