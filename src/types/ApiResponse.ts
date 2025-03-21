/**
 * Стандартный тип ответа API
 */
export interface ApiResponse<T = any> {
	success: boolean
	error?: string
	data?: T
}
