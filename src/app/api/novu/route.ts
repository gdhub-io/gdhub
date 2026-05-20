import { Client, serve } from "@novu/framework/next";
import { testWorkflow } from "@/services/novu/workflows/test.workflow";

const client = new Client({
	secretKey: process.env.NOVU_API_SECRET as string,
});

export const { GET, POST, OPTIONS } = serve({
	client,
	workflows: [testWorkflow],
});
