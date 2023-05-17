import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections'

export const specialistsSchema: CollectionCreateSchema = {
	name: 'specialists',
	fields: [{ name: '.*', type: 'auto' }],
}
