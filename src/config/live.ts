/** The "Sborka" live studio (GDHUB-207): one Daily room run by a hub admin. */
export const SBORKA_ROOM = "sborka";

/** A room nobody closes still ends: Daily ejects everyone at its expiry. */
export const SBORKA_ROOM_HOURS = 12;

export const SBORKA_MAX_PARTICIPANTS = 20;

/** While the room is closed, a waiting guest asks again this often. */
export const SBORKA_WAIT_POLL_MS = 5000;

/** The speaker's editing frame is drawn only from this many cameras on screen. */
export const SBORKA_SPEAKER_FRAME_MIN = 3;

export const SBORKA_STREAM = { width: 1920, height: 1080 } as const;

export const SBORKA_DEFAULT_RTMP_URL = "rtmp://a.rtmp.youtube.com/live2";

/** Where the browser keeps the admin's stream settings between broadcasts. */
export const SBORKA_SETTINGS_STORAGE_KEY = "gdhub.live.sborka.settings";
