import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'

export const specialistsSchema: CollectionCreateSchema = {
	name: 'specialists',
	fields: [
		{ name: 'id', type: 'string', index: true },
		{ name: 'city', type: 'string', facet: true, optional: true },
		{ name: 'country', type: 'string', facet: true, optional: true },
		{ name: 'direction', type: 'string', facet: true },
		{ name: 'level', type: 'string', facet: true },
		{ name: 'name', type: 'string', facet: true },
		{ name: 'skills', type: 'string[]', facet: true, optional: true },
		{ name: 'tools', type: 'string[]', facet: true, optional: true },
		{ name: 'jobs', type: 'string[]', facet: true, optional: true },
		{ name: 'schools', type: 'string[]', facet: true, optional: true },
		{ name: 'createdAt', type: 'int32' },
		{ name: 'updatedAt', type: 'int32' },
	],
}
