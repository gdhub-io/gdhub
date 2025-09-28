// Pages metadata for LLM/context usage
// Keep descriptions concise and human-readable

export type PageInfo = {
	path: string
	title: string
	description: string
}

export const LANGGRAPH_PAGES: ReadonlyArray<PageInfo> = [
	{
		path: '/',
		title: 'Home',
		description: 'Overview of the platform, featured projects, events, and blog highlights.',
	},
	{
		path: '/projects',
		title: 'Projects',
		description: 'Directory of projects with filters and navigation to project pages.',
	},
	{
		path: '/project/{slug}',
		title: 'Project',
		description: 'Project overview with team, reports, and open vacancies.',
	},
	{
		path: '/vacancies',
		title: 'Vacancies',
		description: 'Open positions across teams and projects.',
	},
	{
		path: '/events',
		title: 'Events',
		description: 'List of upcoming and archived events.',
	},
	{
		path: '/event/{slug}',
		title: 'Event',
		description: 'Event details: description, schedule, and participation info.',
	},
	{ path: '/blog', title: 'Blog', description: 'Articles and news from the community.' },
	{ path: '/blog/{slug}', title: 'Blog Post', description: 'Full article content.' },
	{
		path: '/hub',
		title: 'Hub',
		description: 'Community hub with access to projects, members, mentors, and resources.',
	},
	{
		path: '/hub/projects',
		title: 'Hub Projects',
		description: 'Public projects board with filters.',
	},
	{
		path: '/hub/members',
		title: 'Hub Members',
		description: 'Members directory with profiles.',
	},
	{
		path: '/hub/mentors',
		title: 'Hub Mentors',
		description: 'Mentors directory.',
	},
	{
		path: '/devlog/{projectReportId}',
		title: 'Project Devlog',
		description: 'Public devlog post for a project.',
	},
	{
		path: '/cookie-policy',
		title: 'Cookie Policy',
		description: 'Cookies usage policy.',
	},
	{
		path: '/registration',
		title: 'Registration',
		description: 'User registration page.',
	},
	{
		path: '/signin',
		title: 'Sign In',
		description: 'User authentication page.',
	},
]

export default LANGGRAPH_PAGES
