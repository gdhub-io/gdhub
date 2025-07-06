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

		const importableUsers = await prisma.user.findMany({
			where: {
				OR: [
					{
						onboardingDone: true,
					},
					{
						onboardingDone: false,
						agreements: {
							path: ['needSubscribeToNewsletter'],
							equals: true,
						},
					},
				],
				email: {
					notIn: existedUsersEmails,
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

		let importedUsersCount = 0
		for (const user of importableUsers) {
			const agreements = user.agreements as Record<string, boolean>

			await brevoApi.contacts.createContact({
				email: user.email!,
				listIds: [2],
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

			importedUsersCount++
		}

		console.log(`[brevo: import-users] Imported ${importedUsersCount} users`)

		// update existing contacts data
		let updatedContactsCount = 0
		for (const contact of allContacts) {
			const user = await prisma.user.findUnique({
				where: {
					email: contact.email,
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

			if (!user) {
				continue
			}

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

			updatedContactsCount++
		}

		console.log(`[brevo: update-contacts] Updated ${updatedContactsCount} contacts`)
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
