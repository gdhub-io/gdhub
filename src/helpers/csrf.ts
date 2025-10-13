import { nextCsrf } from "next-csrf";
import { env } from "./env";

const { csrf, setup } = nextCsrf({
	secret: env("CSRF_SECRET"),
});

export { csrf, setup };
