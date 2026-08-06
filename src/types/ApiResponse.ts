/**
 * The standard API response type
 */
export interface ApiResponse<T = any> {
	success: boolean;
	error?: string;
	data?: T;
}
