import { execFile } from "node:child_process";
import net from "node:net";
import { promisify } from "node:util";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createMocks } from "node-mocks-http";
import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const execFileAsync = promisify(execFile);

const sessionUser = vi.hoisted(() => ({
	id: "docker-it-author",
	email: "docker-it-author@example.com",
	roles: ["Author", "Admin"],
}));

vi.mock("next-auth", () => ({
	getServerSession: vi.fn(async () => ({
		user: {
			id: sessionUser.id,
			email: sessionUser.email,
			name: "Docker IT Author",
			roles: sessionUser.roles,
		},
	})),
}));

vi.mock("@/pages/api/auth/[...nextauth]", () => ({
	authOptions: {},
}));

const shouldRunDockerIntegrationTests = ["1", "true", "yes"].includes(
	(process.env.RUN_DOCKER_INTEGRATION_TESTS ?? "").toLowerCase(),
);
const describeDocker = shouldRunDockerIntegrationTests ? describe : describe.skip;
const containerName = `gdhub-prisma-it-${process.pid}-${Date.now()}`;
const databaseName = "gdhub_test";
const shadowDatabaseName = "gdhub_test_shadow";
const databaseUser = "postgres";
const databasePassword = "postgres";

let databaseUrl: string;
let shadowDatabaseUrl: string;
let prisma: typeof import("../src/services/prisma").prisma;
let projectLifecycleHandler: (req: any, res: any) => Promise<void>;
let privacyHandler: (req: any, res: any) => Promise<void>;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getFreePort = async () =>
	new Promise<number>((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();

			if (!address || typeof address === "string") {
				server.close(() => reject(new Error("Unable to allocate test port")));
				return;
			}

			const { port } = address;
			server.close(() => resolve(port));
		});
	});

const runDocker = async (args: string[]) => {
	return execFileAsync("docker", args, {
		timeout: 120_000,
		maxBuffer: 1024 * 1024 * 4,
	});
};

const waitForPostgres = async () => {
	const startedAt = Date.now();
	let lastError: unknown;

	while (Date.now() - startedAt < 60_000) {
		try {
			await runDocker([
				"exec",
				containerName,
				"pg_isready",
				"-U",
				databaseUser,
				"-d",
				databaseName,
			]);
			return;
		} catch (error) {
			lastError = error;
			await delay(1000);
		}
	}

	throw new Error(`Postgres test container did not become ready: ${lastError}`);
};

const migrateDatabase = async () => {
	await execFileAsync(
		"./node_modules/.bin/gdhub-prisma",
		[
			"deploy",
			"--schema",
			"./node_modules/@gdhub-io/gdhub-prisma/prisma/schema.prisma",
		],
		{
			env: {
				...process.env,
				DATABASE_URL: databaseUrl,
				DATABASE_SHADOW_URL: shadowDatabaseUrl,
			},
			timeout: 120_000,
			maxBuffer: 1024 * 1024 * 8,
		},
	);
};

const parseJsonResponse = <T>(res: ReturnType<typeof createMocks>["res"]) => {
	const data = res._getData();
	return typeof data === "string" ? (JSON.parse(data) as T) : (data as T);
};

const callHandler = async (
	handler: (req: any, res: any) => unknown,
	{
		method,
		url,
		query,
		body,
	}: {
		method: any;
		url: string;
		query?: Record<string, unknown>;
		body?: Record<string, unknown>;
	},
) => {
	const { req, res } = createMocks({ method, url, query, body });

	await Promise.resolve(handler(req as any, res as any));

	return res;
};

const createAuthorWithSpeciality = async (id = sessionUser.id) => {
	const direction = await prisma.workDirection.create({
		data: { name: `Docker IT Direction ${id}` },
	});
	const user = await prisma.user.create({
		data: {
			id,
			email: `${id}@example.com`,
			name: `User ${id}`,
			roles: [prismaClient.UserRole.Author],
		},
	});
	const speciality = await prisma.speciality.create({
		data: {
			name: `Speciality ${id}`,
			specialization: "Engineering",
			level: prismaClient.SkillLevel.Skillful,
			workDirectionId: direction.id,
			userId: user.id,
			openForQuestions: [],
		},
	});

	return { direction, speciality, user };
};

const createProjectWithTeam = async ({
	id,
	name,
	slug,
	authorId,
	teamId,
	teamName,
	status = prismaClient.ProjectStatus.Approved,
}: {
	id: string;
	name: string;
	slug: string;
	authorId: string;
	teamId: string;
	teamName: string;
	status?: prismaClient.ProjectStatus;
}) => {
	await prisma.$executeRaw`
		INSERT INTO "Project" (
			"id",
			"name",
			"slug",
			"agree",
			"status",
			"authorId",
			"createdAt",
			"updatedAt",
			"startedAt"
		)
		VALUES (
			${id},
			${name},
			${slug},
			true,
			${status}::"ProjectStatus",
			${authorId},
			NOW(),
			NOW(),
			NOW()
		)
	`;
	await prisma.$executeRaw`
		INSERT INTO "Team" ("id", "name", "slug", "projectId")
		VALUES (${teamId}, ${teamName}, ${`${teamId}-slug`}, ${id})
	`;

	return prisma.project.findUniqueOrThrow({
		where: { id },
		include: { team: true },
	});
};

describeDocker("Docker-backed Prisma integration", () => {
	beforeAll(async () => {
		const port = await getFreePort();
		databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/${databaseName}`;
		shadowDatabaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/${shadowDatabaseName}`;
		process.env.DATABASE_URL = databaseUrl;
		process.env.DATABASE_SHADOW_URL = shadowDatabaseUrl;

		await runDocker([
			"run",
			"--rm",
			"-d",
			"--name",
			containerName,
			"-e",
			`POSTGRES_DB=${databaseName}`,
			"-e",
			`POSTGRES_USER=${databaseUser}`,
			"-e",
			`POSTGRES_PASSWORD=${databasePassword}`,
			"-p",
			`127.0.0.1:${port}:5432`,
			"pgvector/pgvector:pg16",
		]);

		await waitForPostgres();
		await runDocker([
			"exec",
			containerName,
			"createdb",
			"-U",
			databaseUser,
			shadowDatabaseName,
		]);
		await migrateDatabase();

		({ prisma } = await import("../src/services/prisma"));
		const lifecycleRoute = await import(
			"../src/app/api/user/project/lifecycle/route"
		);
		const privacyRoute = await import("../src/app/api/user/privacy/route");
		const makeAppRouteHandler =
			(route: { GET?: any; POST?: any }) =>
			async (req: any, res: any) => {
				const method = (req.method ?? "GET").toUpperCase();
				const queryEntries = Object.entries(req.query ?? {}).flatMap(
					([key, value]) =>
						Array.isArray(value)
							? value.map((v) => [key, String(v)] as [string, string])
							: value != null
								? [[key, String(value)] as [string, string]]
								: [],
				);
				const queryString = new URLSearchParams(queryEntries).toString();
				const url = `http://test${req.url ?? "/"}${
					queryString ? (req.url?.includes("?") ? "&" : "?") + queryString : ""
				}`;
				const init: RequestInit = { method };
				if (method !== "GET" && method !== "HEAD" && req.body != null) {
					init.headers = { "content-type": "application/json" };
					init.body =
						typeof req.body === "string" ? req.body : JSON.stringify(req.body);
				}
				const request = new Request(url, init);
				const { NextRequest } = await import("next/server");
				const nextReq = new NextRequest(request);
				const fn: any = method === "POST" ? route.POST : route.GET;
				const response = await fn(nextReq as any, {
					params: Promise.resolve({}),
				});
				const text = await response.text();
				res.statusCode = response.status;
				res._getStatusCode = () => response.status;
				res._getData = () => text;
			};
		privacyHandler = makeAppRouteHandler(privacyRoute);
		projectLifecycleHandler = makeAppRouteHandler(lifecycleRoute);
	}, 180_000);

	afterAll(async () => {
		await prisma?.$disconnect();

		if (shouldRunDockerIntegrationTests) {
			await runDocker(["rm", "-f", containerName]).catch(() => undefined);
		}
	}, 30_000);

	it("computes open project positions through Team.project relation", async () => {
		const { speciality } = await createAuthorWithSpeciality();
		const project = await createProjectWithTeam({
			id: "docker-it-open-positions-project",
			name: "Docker IT Open Positions",
			slug: "docker-it-open-positions",
			authorId: sessionUser.id,
			teamId: "docker-it-open-positions-team",
			teamName: "Docker IT Open Positions Team",
		});
		await prisma.teamMember.create({
			data: {
				userId: sessionUser.id,
				specialityId: speciality.id,
				teamId: project.team?.id ?? "",
				startedAt: new Date(),
				status: prismaClient.TeamMemberStatus.Founder,
				position: "Founder",
			},
		});
		await prisma.teamVacancy.create({
			data: {
				title: "Developer",
				description: "Build things",
				directionId: speciality.workDirectionId,
				teamId: project.team?.id ?? "",
				status: prismaClient.TeamVacancyStatus.Published,
				finishedAt: new Date(Date.now() + 86_400_000),
			},
		});

		const { getWorkedProjects } = await import("../src/services/prisma/queries");
		const projects = await getWorkedProjects();
		const result = projects.find((item) => item.id === project.id);

		expect(result?.hasOpenPositions).toBe(true);
		expect("teamId" in (result ?? {})).toBe(false);
	});

	it("previews, archives, and restores a project through lifecycle endpoint", async () => {
		const { speciality } = await createAuthorWithSpeciality(
			"docker-it-lifecycle-author",
		);
		sessionUser.id = "docker-it-lifecycle-author";
		sessionUser.email = "docker-it-lifecycle-author@example.com";

		const project = await createProjectWithTeam({
			id: "docker-it-lifecycle-project-id",
			name: "Docker IT Lifecycle Project",
			slug: "docker-it-lifecycle-project",
			authorId: sessionUser.id,
			teamId: "docker-it-lifecycle-team",
			teamName: "Docker IT Lifecycle Team",
		});
		await prisma.teamMember.create({
			data: {
				userId: sessionUser.id,
				specialityId: speciality.id,
				teamId: project.team?.id ?? "",
				startedAt: new Date(),
				status: prismaClient.TeamMemberStatus.Founder,
				position: "Founder",
			},
		});

		const previewRes = await callHandler(projectLifecycleHandler, {
			method: "GET",
			url: "/api/user/project/lifecycle",
			query: { id: project.id },
		});
		const preview = parseJsonResponse<{ canDelete: boolean }>(previewRes);

		expect(previewRes._getStatusCode(), previewRes._getData()).toBe(200);
		expect(preview.canDelete).toBe(false);

		const archiveRes = await callHandler(projectLifecycleHandler, {
			method: "POST",
			url: "/api/user/project/lifecycle",
			body: { id: project.id, action: "archive" },
		});

		expect(archiveRes._getStatusCode(), archiveRes._getData()).toBe(200);
		await expect(
			prisma.project.findUniqueOrThrow({ where: { id: project.id } }),
		).resolves.toMatchObject({
			status: prismaClient.ProjectStatus.Archived,
		});

		const restoreRes = await callHandler(projectLifecycleHandler, {
			method: "POST",
			url: "/api/user/project/lifecycle",
			body: { id: project.id, action: "restore" },
		});

		expect(restoreRes._getStatusCode(), restoreRes._getData()).toBe(200);
		await expect(
			prisma.project.findUniqueOrThrow({ where: { id: project.id } }),
		).resolves.toMatchObject({
			status: prismaClient.ProjectStatus.Approved,
		});
	});

	it("hard-deletes an empty project through lifecycle endpoint", async () => {
		const { user } = await createAuthorWithSpeciality("docker-it-delete-author");
		sessionUser.id = user.id;
		sessionUser.email = user.email ?? sessionUser.email;

		const project = await createProjectWithTeam({
			id: "docker-it-empty-project-id",
			name: "Docker IT Empty Project",
			slug: "docker-it-empty-project",
			authorId: user.id,
			teamId: "docker-it-empty-team",
			teamName: "Docker IT Empty Team",
		});

		const deleteRes = await callHandler(projectLifecycleHandler, {
			method: "POST",
			url: "/api/user/project/lifecycle",
			body: { id: project.id, action: "delete" },
		});

		expect(deleteRes._getStatusCode(), deleteRes._getData()).toBe(200);
		await expect(
			prisma.project.findUnique({ where: { id: project.id } }),
		).resolves.toBeNull();
		await expect(
			prisma.team.findUnique({ where: { id: project.team?.id } }),
		).resolves.toBeNull();
	});

	it("exports and anonymizes user personal data through privacy endpoint", async () => {
		const { direction, user } = await createAuthorWithSpeciality(
			"docker-it-privacy-user",
		);
		sessionUser.id = user.id;
		sessionUser.email = user.email ?? sessionUser.email;

		await prisma.profile.create({
			data: {
				userId: user.id,
				name: "Privacy User",
				yearOfBirth: 1990,
				timeForWork: [1, 2],
			},
		});
		await prisma.account.create({
			data: {
				userId: user.id,
				type: "oauth",
				provider: "test",
				providerAccountId: "privacy-provider-account",
				access_token: "secret-token",
			},
		});
		await prisma.session.create({
			data: {
				userId: user.id,
				sessionToken: "privacy-session-token",
				expires: new Date(Date.now() + 86_400_000),
			},
		});
		await prisma.speciality.create({
			data: {
				name: "Privacy Portfolio",
				specialization: "Art",
				level: prismaClient.SkillLevel.Beginner,
				workDirectionId: direction.id,
				userId: user.id,
				openForQuestions: ["portfolio"],
			},
		});

		const previewRes = await callHandler(privacyHandler, {
			method: "GET",
			url: "/api/user/privacy",
			query: { action: "prepare-delete" },
		});
		const preview = parseJsonResponse<{ recommendedAction: string }>(previewRes);

		expect(previewRes._getStatusCode(), previewRes._getData()).toBe(200);
		expect(preview.recommendedAction).toBe("anonymize");

		const exportRes = await callHandler(privacyHandler, {
			method: "GET",
			url: "/api/user/privacy",
			query: { action: "export" },
		});
		const exported = parseJsonResponse<{ subjectUserId: string }>(exportRes);

		expect(exportRes._getStatusCode(), exportRes._getData()).toBe(200);
		expect(exported.subjectUserId).toBe(user.id);

		const deleteRes = await callHandler(privacyHandler, {
			method: "POST",
			url: "/api/user/privacy",
			body: {
				action: "delete-personal-data",
				reason: "integration-test",
			},
		});

		expect(deleteRes._getStatusCode(), deleteRes._getData()).toBe(200);

		const anonymizedUser = await prisma.user.findUniqueOrThrow({
			where: { id: user.id },
			include: {
				_count: { select: { accounts: true, sessions: true } },
				profile: true,
				specialities: true,
			},
		});

		expect(anonymizedUser.email).toBeNull();
		expect(anonymizedUser.name).toBe("Deleted user");
		expect(anonymizedUser.personalDataDeletedAt).toBeTruthy();
		expect(anonymizedUser.personalDataDeletionReason).toBe("integration-test");
		expect(anonymizedUser._count.accounts).toBe(0);
		expect(anonymizedUser._count.sessions).toBe(0);
		expect(anonymizedUser.profile).toBeNull();
		expect(anonymizedUser.specialities.length).toBeGreaterThan(0);
		expect(
			anonymizedUser.specialities.every(
				(speciality) => speciality.name === "Deleted user speciality",
			),
		).toBe(true);
	});
});
