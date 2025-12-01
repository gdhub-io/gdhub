export default function MyEventPage() {
	return null;
}

export const getServerSideProps = async ({
	params,
}: {
	params: { eventId: string };
}) => {
	const { eventId } = params;

	if (!eventId) {
		return {
			notFound: true,
		};
	}

	return {
		redirect: {
			destination: `/my/events/${eventId}/schedule`,
			permanent: false,
		},
	};
};
