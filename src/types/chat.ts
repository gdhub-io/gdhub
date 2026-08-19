export type MatrixChatSessionResponse = {
	userId: string;
	token: string;
	deviceId: string;
};

/** What the browser needs to build a Matrix client. */
export type MatrixSession = {
	accessToken?: string;
	userId?: string;
	deviceId?: string;
};
