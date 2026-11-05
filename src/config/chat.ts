/** The Matrix account Announcements posts come from; never a platform user. */
export const GDHUB_MATRIX_LOCALPART = "gdhub";
export const GDHUB_MATRIX_DISPLAY_NAME = "GDHub";

/** Registry key of the one Announcements room. */
export const ANNOUNCEMENTS_DIRECT_KEY = "announcements";
export const ANNOUNCEMENTS_ROOM_NAME = "Announcements";
export const ANNOUNCEMENTS_ROOM_TOPIC = "News from GDHub";

/** How long a confirmed membership skips the join round-trip. */
export const ANNOUNCEMENTS_JOIN_RECHECK_SECONDS = 24 * 60 * 60;

/** Synapse's `max_upload_size`; the composer refuses bigger files up front. */
export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** Images are shrunk in the browser to this longest side before upload. */
export const CHAT_IMAGE_MAX_SIDE = 2560;

export const CHAT_TEXT_MAX_LENGTH = 10_000;
