import { GetContactDetails } from '@/services/brevo/api'
import { brevoApi } from '../services/brevo'
import { prisma } from '../services/prisma'

async function main() {
	try {
		// Fetch all contacts with pagination
		const limit = 50
		let offset = 0
		let allContacts: GetContactDetails[] = []
		let totalCount = 0
		let firstRequest = true

		do {
			const {
				data: { contacts, count },
			} = await brevoApi.contacts.getContacts({ limit, offset })

			if (firstRequest) {
				totalCount = count
				firstRequest = false
			}

			allContacts = allContacts.concat(contacts)
			offset += limit
		} while (allContacts.length < totalCount)

		const existedUsersEmails = allContacts.map((user) => user.email)

		const updateableUsers = await prisma.user.findMany({
			where: {
				email: {
					in: existedUsersEmails,
				},
			},
			include: {
				profile: true,
				specialities: {
					include: {
						direction: true,
					},
				},
			},
		})

		let updatedUsersCount = 0
		for (const user of updateableUsers) {
			const agreements = user.agreements as Record<string, boolean>

			await brevoApi.contacts.updateContact(user.email!, {
				attributes: {
					MAIN_LOCALE: user.lang,
					MAIN_INTEREST: user.profile?.primaryInterest,
					FIRSTNAME: user.profile?.name || user.name,
					HAS_SUBSCRIBE_TO_NEWSLETTER: agreements?.needSubscribeToNewsletter || false,
					CREATION_DATE: user.createdAt.toISOString(),
					COUNTRY: user.profile?.country,
					ONBOARDING_DONE: user.onboardingDone,
					DIRECTIONS: user.specialities
						.map(
							(speciality: { direction: { name: string }; level: string }) =>
								`${speciality.direction.name} (${speciality.level})`
						)
						.join(', '),
				},
			})

			updatedUsersCount++
		}

		console.log(`[brevo: update-users] Updated ${updatedUsersCount} users`)
	} catch (error) {
		console.error(error)
	}
}

main()
	.then(() => {
		process.exit(0)
	})
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
