import axios from "axios";

/**
 * How array query parameters go on the wire.
 *
 * axios defaults to `?key[]=a&key[]=b`, and nothing on the server reads a
 * bracketed key: `withValidation(…, "query")` collapses repeated *plain* keys,
 * and hand-rolled routes call `searchParams.getAll("key")`. So an array filter
 * silently vanished and the endpoint answered as if no filter had been sent —
 * the hub counted every event with a schedule as "upcoming", and the mentorship
 * form asked for expert-level specialities and got all of them.
 *
 * `?key=a&key=b` is what both readers expect, so that is what we send.
 */
export function configureAxios() {
	axios.defaults.paramsSerializer = {
		indexes: null,
	};
}
