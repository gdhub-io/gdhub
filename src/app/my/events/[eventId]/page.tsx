import { notFound, redirect } from "next/navigation";

type Params = Promise<{ eventId: string }>;

export default async function MyEventPage({ params }: { params: Params }) {
	const { eventId } = await params;
	if (!eventId) notFound();
	redirect(`/my/events/${eventId}/schedule`);
}
