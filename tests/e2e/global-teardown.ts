import { readFileSync, unlinkSync } from 'fs'
import { join } from 'path'

export default async function globalTeardown() {
	try {
		const metaPath = join(process.cwd(), '.playwright', 'e2e-container.json')
		const { id } = JSON.parse(readFileSync(metaPath, 'utf8'))
		// Using Docker CLI via testcontainers is not needed when reuse is enabled.
		// Containers with reuse stay up; we skip stopping to speed up dev cycles.
		// If you want to stop, you can implement dockerode stop here.
	} catch {}

	// Stop Next server if started
	try {
		const pidPath = join(process.cwd(), '.playwright', 'server.pid')
		const pid = Number(readFileSync(pidPath, 'utf8'))
		if (pid) {
			process.kill(-pid, 'SIGTERM')
		}
		unlinkSync(pidPath)
	} catch {}
}
