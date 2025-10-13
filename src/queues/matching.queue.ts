import { Queue } from "bullmq";
import { redisConnect } from "@/services/redis";

export const matchingQueue = new Queue("matching", {
	connection: redisConnect(),
	defaultJobOptions: {
		attempts: 2,
		backoff: {
			type: "exponential",
			delay: 5000,
		},
	},
});

export default matchingQueue;
