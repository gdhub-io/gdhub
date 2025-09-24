import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { PostgreSqlContainer } from '@testcontainers/postgresql'

export default async function globalSetup() {
	// Enable container reuse across processes so it survives setup process
	process.env.TESTCONTAINERS_REUSE_ENABLE = process.env.TESTCONTAINERS_REUSE_ENABLE || '1'

	const container = await new PostgreSqlContainer('pgvector/pgvector:pg15').withReuse().start()

	const host = container.getHost()
	const port = container.getPort()
	const database = container.getDatabase()
	const username = container.getUsername()
	const password = container.getPassword()

	// Prepare runtime env for Next.js and Prisma
	const runtimeEnvPath = join(process.cwd(), '.env.e2e.runtime')
	const envContent = [
		`NODE_ENV=test`,
		`NEXTAUTH_URL=http://localhost:3000`,
		`NEXTAUTH_SECRET=${process.env.NEXTAUTH_SECRET || 'testsecret'}`,
		`DATABASE_HOST=${host}`,
		`DATABASE_PORT=${port}`,
		`DATABASE_NAME=${database}`,
		`DATABASE_USERNAME=${username}`,
		`DATABASE_PASSWORD=${password}`,
		// Prisma/Gdhub seed uses DATABASE_URL directly; set it explicitly for e2e
		`DATABASE_URL=postgres://${username}:${password}@${host}:${port}/${database}?schema=public`,
		`NEXT_PUBLIC_TOLGEE_API_URL=${process.env.NEXT_PUBLIC_TOLGEE_API_URL || 'http://localhost:8080'}`,
		`TYPESENSE_ADMIN_API=${process.env.TYPESENSE_ADMIN_API || 'xyz'}`,
		`NEXT_PUBLIC_TYPESENSE_HOST=${process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost'}`,
		`NEXT_PUBLIC_TYPESENSE_PORT=${process.env.NEXT_PUBLIC_TYPESENSE_PORT || '8108'}`,
		`NEXT_PUBLIC_TYPESENSE_PROTOCOL=${process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http'}`,
		`BREVO_API_KEY=${process.env.BREVO_API_KEY || 'dummy'}`,
		`SANITY_PROJECT_ID=${process.env.SANITY_PROJECT_ID || 'dummy'}`,
		`SANITY_DATASET=${process.env.SANITY_DATASET || 'dummy'}`,
		`SANITY_TOKEN=${process.env.SANITY_TOKEN || ''}`,
		`GOOGLE_OAUTH_CLIENT_ID=${process.env.GOOGLE_OAUTH_CLIENT_ID || 'dummy'}`,
		`GOOGLE_OAUTH_CLIENT_SECRET=${process.env.GOOGLE_OAUTH_CLIENT_SECRET || 'dummy'}`,
		`EMAIL_FROM=${process.env.EMAIL_FROM || 'test@example.com'}`,
		`EMAIL_SERVER=${process.env.EMAIL_SERVER || 'smtp://localhost:1025'}`,
	].join('\n')

	writeFileSync(runtimeEnvPath, envContent)

	// Save container info for teardown
	const metaDir = join(process.cwd(), '.playwright')
	mkdirSync(metaDir, { recursive: true })
	writeFileSync(
		join(metaDir, 'e2e-container.json'),
		JSON.stringify({ id: container.getId(), name: container.getName() })
	)

	// Run migrations against started DB
	execSync('dotenv -e .env.e2e.runtime -- npm run db:deploy', {
		stdio: 'inherit',
		env: { ...process.env },
	})

	// Seed database with initial data
	execSync('dotenv -e .env.e2e.runtime -- npm run db:seed', {
		stdio: 'inherit',
		env: { ...process.env },
	})
}
