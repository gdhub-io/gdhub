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
		removeOnComplete: { age: 3600, count: 100 },
		removeOnFail: { age: 24 * 3600, count: 500 },
	},
});

export default telegramQueue;
