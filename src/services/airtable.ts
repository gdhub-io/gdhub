import Airtable from 'airtable'
import dayjs from 'dayjs'

const AirtableService = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
	process.env.AIRTABLE_BASE_ID as string
)

export default AirtableService

export const findOrCreateMember = async ({ email, name, image }: any) => {
	try {
		let [member] = await AirtableService('Accounts')
			.select({
				filterByFormula: `Email = "${email}"`,
				maxRecords: 1,
			})
			.all()

		if (!member) {
			member = await AirtableService('Accounts').create({
				Email: email,
				'Image Link': image,
				Roles: ['Guest'],
				Active: true,
				'Created At': dayjs().toISOString(),
			})
		}

		const roles = member.get('Roles') as string[]
		const profileId = member.get('Profile') as any
		let profile: any

		if (!profileId) {
			profile = await createProfile({ name, accountId: member.getId() })
		} else {
			profile = await getProfile(email)
		}

		return {
			id: member.getId(),
			roles: roles ? roles.map((role: string) => role.toLowerCase()) : [],
			name: profile.Name as string,
			profileId: profileId ? profileId[0] : null,
		}
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const getProfile = async (email: string) => {
	try {
		const [profile] = await AirtableService('Profiles')
			.select({
				filterByFormula: `FIND("${email}", Account)`,
			})
			.all()

		const timeForWork = profile.get('Time For Work') as string

		return { id: profile.getId(), ...profile.fields, 'Time For Work': timeForWork ? timeForWork.split('-') : null }
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const createProfile = async ({ name, accountId }: any) => {
	try {
		const newProfile = await AirtableService('Profiles').create({
			Account: [accountId],
			Name: name,
		})

		return newProfile?.fields
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const updateProfile = async (profileId: string, data: any) => {
	try {
		await AirtableService('Profiles').update(profileId, data)

		return true
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const getDocumentationVideos = async () => {
	try {
		const videos = await AirtableService('Documentation').select().all()

		return videos.map((i) => {
			if (i.fields.hasOwnProperty('Preview')) {
				const Preview = i.fields.Preview as any[]
				return { ...i.fields, Preview: Preview[0] }
			} else {
				return i.fields
			}
		})
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const getWorkedProjects = async () => {
	try {
		const projects = await AirtableService('Project Ideas')
			.select({
				// fields: ['Name', 'Ideas Embed Link', 'Status'],
				filterByFormula: `AND(Status = "Approved", FIND(Stage, "${[
					'Recruiting',
					'Prototyping',
					'Production',
					'Release',
				].join(' ')}"))`,
			})
			.all()

		return projects.map((p) => {
			return { id: p.id, ...p.fields }
		})
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		throw error
	}
}

export const getPitchedProjects = async (seasonId: string) => {
	try {
		const projects = await AirtableService('Project Ideas')
			.select({
				// fields: ['Name', 'Ideas Embed Link', 'Status'],
				filterByFormula: `AND({Season ID} = "${seasonId}", Status = "Approved", Stage = "Release")`,
			})
			.all()

		return projects.map((p) => {
			return { id: p.id, ...p.fields }
		})
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		throw error
	}
}

export const getSeasonBySlug = async (slug: string) => {
	try {
		const [season] = await AirtableService('Seasons')
			.select({
				// fields: ['Name', 'Ideas Embed Link', 'Status'],
				filterByFormula: `Slug = "${slug}"`,
				maxRecords: 1,
			})
			.all()

		return { id: season.id, ...season.fields }
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		throw error
	}
}

export const createProjectReport = async (data: any) => {
	try {
		const [newProjectReport] = await AirtableService('Project Reports').create({
			...data,
			Project: [data.Project],
		})

		return { id: newProjectReport.id, ...newProjectReport.fields }
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const updateProjectReport = async (reportId: string, data: any) => {
	try {
		const projectReport = await AirtableService('Project Reports').update(reportId, data)

		return { id: projectReport.id, ...projectReport.fields }
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		throw error
	}
}

export const getActiveStage = async (seasonId: string) => {
	try {
		const [stage] = await AirtableService('Season Stages')
			.select({
				filterByFormula: `AND({Season ID} = "${seasonId}", Status = "Active")`,
				maxRecords: 1,
			})
			.all()

		return { id: stage.id, ...stage.fields }
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		throw error
	}
}

export const deleteProjectReport = async (id: string) => {
	try {
		await AirtableService('Project Reports').destroy(id)

		return true
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const getProjectReports = async ({ projectId }: any) => {
	try {
		const projectReports = await AirtableService('Project Reports')
			.select({
				filterByFormula: `Project = "${projectId}"`,
			})
			.all()

		return projectReports?.map((r: any) => ({ id: r.id, ...r.fields }))
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		return null
	}
}

export const getProjectReport = async (reportId: string) => {
	try {
		const report = await AirtableService('Project Reports').find(reportId)

		if (!report) throw Error('Not found the report')

		return { id: report.id, ...report.fields }
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		throw error
	}
}

export const getSeasonsSlugs = async () => {
	try {
		const seasonsSlugs = await AirtableService('Seasons')
			.select({
				fields: ['Slug'],
				filterByFormula: `Status = "Active"`,
			})
			.all()

		if (!seasonsSlugs) throw Error('Not found the report')

		return seasonsSlugs.map((s) => s.get('Slug'))
	} catch (error: any) {
		console.error('[AIRTABLE ERROR]', error)
		throw error
	}
}
