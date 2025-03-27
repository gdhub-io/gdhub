import { workflow } from '@novu/framework'
import z from 'zod'
import { renderEmail } from './emails/test.email'

export const testWorkflow = workflow(
	'test-workflow',
	async ({ step, payload }) => {
		await step.email(
			'send-email',
			async (controls) => {
				return {
					subject: controls.subject,
					body: await renderEmail(payload.userName),
				}
			},
			{
				controlSchema: z.object({
					subject: z.string().default('A Successful Test on Novu from {{userName}}'),
				}),
			}
		)
	},
	{
		payloadSchema: z.object({
			userName: z.string().default('John Doe'),
		}),
	}
)
