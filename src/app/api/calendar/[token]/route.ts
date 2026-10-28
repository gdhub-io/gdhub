import { calendarFeed } from "@/repositories/checkpoint-calendar";

/**
 * The checkpoint calendar a person subscribed to. Calendar apps fetch it on
 * their own schedule, without a session: the signed token is the right.
 */
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ token: string }> },
) {
	const { token } = await params;
	const ics = await calendarFeed(token.replace(/\.ics$/, ""));
	if (!ics) return new Response("Not found", { status: 404 });

	return new Response(ics, {
		headers: {
			"Content-Type": "text/calendar; charset=utf-8",
			"Cache-Control": "private, max-age=900",
		},
	});
}
