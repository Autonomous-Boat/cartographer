"use strict";

import detectDevice from "/assets/scripts/modules/detectDevice.js";
import util from "/assets/scripts/modules/util.js";

const isIOS = detectDevice.detectIOS();

let callbackFunctions = [];
let compassEnabled = false;
let needsPermission = false;
let oldHeading = 0;

function addCallback(func) {
    callbackFunctions.push(func);
}

function manageCompass(event) {
    const heading = event.webkitCompassHeading ? event.webkitCompassHeading : util.normalizeAngle(-event.alpha);

    if (!compassEnabled && heading != 0) {
        compassEnabled = true;
    }

    if (heading != oldHeading && compassEnabled) {
        callbackFunctions.forEach((func) => {
            func(heading);
        })
        
        oldHeading = heading || 0;
    }
}

function sendPermissionRequest(ok, denied, error) {
    DeviceOrientationEvent.requestPermission()
    .then((response) => {
        if (response === "granted") {
            window.addEventListener("deviceorientation", manageCompass, true);
            ok();
        } else {
            denied();
        }
    })
    .catch(() => {
        error();
    });
}

if (!isIOS) {
    window.addEventListener("deviceorientationabsolute", manageCompass, true);
} else {
    needsPermission = true;
}

export default {
    addCallback: addCallback,
    sendPermissionRequest: sendPermissionRequest,
    needsPermission: needsPermission
}