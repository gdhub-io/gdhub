export const adviceRequestSelect = {
	id: true,
	topic: true,
	comment: true,
	status: true,
	finishedAt: true,
	matrixRoomId: true,
	fromUserId: true,
	toUserId: true,
	project: {
		select: {
			id: true,
			name: true,
			coverImage: true,
		},
	},
};

export const buildAdviceRequestContext = (
	adviceRequest: any,
	currentUserId?: string,
) => {
	return {
		type: "advice-request",
		data: {
			id: adviceRequest.id,
			topic: adviceRequest.topic,
			comment: adviceRequest.comment,
			status: adviceRequest.status,
			finishedAt: adviceRequest.finishedAt,
			project: adviceRequest.project,
		},
		isExpert: currentUserId
			? adviceRequest.toUserId === currentUserId
			: undefined,
	};
};
