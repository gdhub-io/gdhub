import { afterEach, describe, expect, it, vi } from "vitest";
import {
	renderLocalMail,
	sendsLocally,
} from "../src/services/novu/local-mail";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("Novu local mail", () => {
	it("is used only when asked for, with a mail server, outside production", () => {
		vi.stubEnv("EMAIL_SERVER", "smtp://localhost:1025");
		vi.stubEnv("NOVU_LOCAL_MAIL", "1");
		vi.stubEnv("NODE_ENV", "development");
		expect(sendsLocally()).toBe(true);

		vi.stubEnv("NODE_ENV", "production");
		expect(sendsLocally()).toBe(false);

		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("NOVU_LOCAL_MAIL", "");
		expect(sendsLocally()).toBe(false);
	});

	it("addresses the email and makes the payload's links clickable", () => {
		const mail = renderLocalMail({
			template: "team-invitation",
			to: { subscriberId: "a@x.dev", email: "a@x.dev" },
			payload: {
				acceptUrl: "http://localhost:3000/invite/abc",
				projectName: "<b>Game</b>",
			},
		});

		expect(mail.to).toBe("a@x.dev");
		expect(mail.subject).toContain("team-invitation");
		expect(mail.html).toContain(
			'<a href="http://localhost:3000/invite/abc">',
		);
		expect(mail.html).toContain("&lt;b&gt;Game&lt;/b&gt;");
	});
});
