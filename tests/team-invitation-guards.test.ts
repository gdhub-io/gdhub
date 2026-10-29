import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const TEAM_API = "src/app/api/user/project/team";

/**
 * An invitation's id is the token in its link. Listing a team's pending
 * invitations, or cancelling one, used to need only a sign-in: anyone could read
 * who was invited to any team, and cancel it.
 */
describe("team invitations are managed only by those who may invite", () => {
	it.each([
		"pending-invitations/route.ts",
		"invitation/route.ts",
	])("%s is guarded by project.members.invite", (route) => {
		const source = readFileSync(`${TEAM_API}/${route}`, "utf8");

		expect(source).toMatch(
			/withSpaceGuard\(\{\s*permission:\s*"project\.members\.invite"/,
		);
	});
});
