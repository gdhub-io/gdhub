import { Queue } from "bullmq";
import { redisConnect } from "@/services/redis";

export const telegramQueue = new Queue("telegram", {
	connection: redisConnect(),
	defaultJobOptions: {
		attempts: 2,
		backoff: {
			type: "exponential",
			delay: 5000,
		},
	},
});

export default telegramQueue;
