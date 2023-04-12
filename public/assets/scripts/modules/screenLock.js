let screenLock = null;

async function getScreenLock() {
    if ("wakeLock" in navigator) {
        screenLock = await navigator.wakeLock.request("screen");

        if (screenLock) {
            return true;
        }
    }
    return false;
}

function releaseScreenLock() {
    if (typeof screenLock !== "undefined" && screenLock != null) {
        screenLock.release()
            .then(() => {
                screenLock = null;
            });
    }
}

export default {
    screenLock: screenLock,
    getScreenLock: getScreenLock,
    releaseScreenLock: releaseScreenLock
}