import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'

export const specialistsSchema: CollectionCreateSchema = {
	name: 'specialists',
	fields: [
		{ name: 'ID', type: 'string', index: true },
		{ name: 'City', type: 'string', facet: true, optional: true },
		{ name: 'Country', type: 'string', facet: true, optional: true },
		{ name: 'Direction', type: 'string', facet: true },
		{ name: 'Level', type: 'string', facet: true },
		{ name: 'Name', type: 'string', facet: true },
		{ name: 'Skills', type: 'string[]', facet: true, optional: true },
		{ name: 'Tools', type: 'string[]', facet: true, optional: true },
		{ name: 'Workplaces', type: 'string[]', facet: true, optional: true },
		{ name: 'Schools', type: 'string[]', facet: true, optional: true },
		{ name: 'Created', type: 'int32' },
	],
}
