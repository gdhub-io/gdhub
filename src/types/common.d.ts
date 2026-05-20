import { type NextApiRequest } from "next";
// Bring dayjs plugin module augmentations (tz, format, etc.) into the
// global compilation. The runtime side effect (dayjs.extend) is invoked
// from @/config/dayjs-setup which is imported by app/layout.tsx.
import "dayjs/plugin/localeData";
import "dayjs/plugin/localizedFormat";
import "dayjs/plugin/relativeTime";
import "dayjs/plugin/timezone";
import "dayjs/plugin/utc";
import "dayjs/plugin/weekday";

declare global {
	type NextApiRequestWithUser = NextApiRequest & { user: Partial<User> };

	type AuthUser = {
		email: string;
		username: string;
		avatar?: string;
		discordId: number;
		id: string | null;
		firstName?: string;
		lastName?: string;
		country?: string;
		access_token?: string;
	};
}

declare global {
	interface Window {
		$crisp?: any;
	}
}
