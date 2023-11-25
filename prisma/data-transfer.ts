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

	const transferName = process.argv[2]
	const skipSteps = process.argv[3] ? Number.parseInt(process.argv[3]) : 0

	if (!transferName) console.log('Need prompt argument transfer name or --all')

	// Step 1
	if (transferName == 'accounts' || (transferName == '--all' && skipSteps == 0))
		await transferAccounts(airtableService, prisma)
	// Step 2
	if (transferName == 'seasons' || (transferName == '--all' && skipSteps <= 1))
		await transferSeasons(airtableService, prisma)
	// Step 3
	if (transferName == 'projects' || (transferName == '--all' && skipSteps <= 2))
		await transferProjects(airtableService, prisma)
	// Step 4
	if (transferName == 'vacancies' || (transferName == '--all' && skipSteps <= 3))
		await transferVacancies(airtableService, prisma)
	// Step 5
	if (transferName == 'team-members' || (transferName == '--all' && skipSteps <= 4))
		await transferTeamMembers(airtableService, prisma)
	// Step 6
	if (transferName == 'lectures' || (transferName == '--all' && skipSteps <= 5))
		await transferLectures(airtableService, prisma)
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
