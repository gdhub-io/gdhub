import { prisma } from '@/services/prisma'
import Airtable from 'airtable'
import { transferAccounts } from './data-transfer/accounts'
import { transferLectures } from './data-transfer/lectures'
import { transferProjects } from './data-transfer/projects'
import { transferSeasons } from './data-transfer/seasons'
import { transferTeamMembers } from './data-transfer/team-members'
import { transferVacancies } from './data-transfer/vacancies'

async function main() {
	const airtableService = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
		process.env.AIRTABLE_BASE_ID as string
	)

	// await transferSeasons(airtableService, prisma)
	// await transferAccounts(airtableService, prisma)
	// await transferProjects(airtableService, prisma)
	// await transferVacancies(airtableService, prisma)
	await transferTeamMembers(airtableService, prisma)
	// await transferLectures(airtableService, prisma)
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (e) => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})
