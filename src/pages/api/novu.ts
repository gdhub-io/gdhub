import { testWorkflow } from '@/services/novu/workflows/test.workflow'
import { Client, serve } from '@novu/framework/next'

const client = new Client({
	secretKey: process.env.NOVU_API_SECRET as string,
})

export default serve({
	client,
	workflows: [testWorkflow],
})
