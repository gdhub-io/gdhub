import * as sdk from "matrix-js-sdk";
import { env } from "@/helpers/env";

export type MatrixSession = {
	accessToken?: string;
	userId?: string;
	deviceId?: string;
};

const BASE_URL = env("MATRIX_CHAT_BASE_URL");
// const SYNAPSE_TOKEN = env('MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN')

export class MatrixService {
	private static instance: MatrixService;
	public client: ReturnType<typeof sdk.createClient> | null = null;

	private constructor() {}

	init(session: MatrixSession) {
		if (this.client) return this.client;

		this.client = sdk.createClient({
			baseUrl: BASE_URL,
			...session,
		});

		return this.client;
	}

	static getInstance() {
		if (!MatrixService.instance) {
			MatrixService.instance = new MatrixService();
		}

		return MatrixService.instance;
	}

	async startClient() {
		if (!this.client) return;

		await this.client.startClient();
	}

	async stopClient() {
		if (!this.client) return;

		await this.client.stopClient();
	}

	// Reset client instance
	reset() {
		if (this.client) {
			this.client.stopClient();
			this.client = null;
		}
	}
}
