export const __port = 8080;

export const enableSendMessagesAndReplies = true; //mute robo lindsay here

export const LINDSAY_ID = "318204205435322368";
export const IAN_ID = "368235194714554369";
export const ROBO_LINDSAY_ID = "811958340967071745";
export const SIMPLE_POLL_BOT_ID = "324631108731928587";

export const TEST_SERVER_ID = "813152605810458645"; //giant lindsays server
export const KIT305_SERVER = "801006169496748063";
export const KIT109_SERVER = "801757073083203634";
export const KIT109_S2_2021_SERVER = "851553122811379762";

export const KIT207_S2_2021_SERVER = "860360630871523339";
export const KIT308_S2_2021_SERVER = "860323794060312596";

export const ERROR_LOG_CHANNEL_ID = "819332984850874368"; //#error-log

export const DEFAULT_VOTE_SIZE_OBS = 10;
export const POLL_COMMAND = 'poll_test';

export const DEFAULT_GUILD_PROPERTIES = {
    feature_attendance: true,
    feature_analytics: true
}

var _TEST_MODE = false; //limit to test server only
export function getTestMode() { return _TEST_MODE; }
export function setTestMode(enabled) { _TEST_MODE = enabled; }

//use this to speed up the analytics pages for dev testing
export const USE_CACHED_FAKE_KIT109_DATA = false;