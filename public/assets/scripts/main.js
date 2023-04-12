"use strict";

import "https://kit.fontawesome.com/93cf390d85.js";

import "/assets/scripts/libraries/leaflet/leaflet.min.js";
import "/assets/scripts/libraries/socketio/socketio.min.js";

import "/assets/scripts/extensions/leaflet/rotatedMarkers.js";
import "/assets/scripts/extensions/leaflet/easyButton.js";
import "/assets/scripts/extensions/leaflet/fullscreen.js";

import compass from "/assets/scripts/modules/compass.js";
import screenLock from "/assets/scripts/modules/screenLock.js";
import util from "/assets/scripts/modules/util.js";

window.addEventListener("load", main);
window.addEventListener("error", (err) => { alert(err.message) });

const socket = io();

const maxZoom = 19;
const minZoom = 0;

const icons = {
    userMarker: L.icon({
        iconUrl: "/assets/images/icons/userMarker.png",
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    })
}

const layers = {
    "Self Hosted": L.tileLayer("/tiles/{z}/{x}/{y}.png", {
        maxZoom: 12,
        minZoom: minZoom,
        noWrap: true,
        attribution: "&copy; <a href='//www.openstreetmap.org/copyright'>2023 OpenStreetMap</a>"
    }),
    "OSM Default": L.tileLayer("//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: maxZoom,
        minZoom: minZoom,
        noWrap: true,
        attribution: "&copy; <a href='//www.openstreetmap.org/copyright'>2023 OpenStreetMap</a>",
        subdomains: ['a', 'b', 'c']
    }),
    "Google Maps": L.tileLayer("//{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: maxZoom,
        minZoom: minZoom,
        noWrap: true,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: "&copy; <a href='//www.google.com/'>2023 Google</a>"
    }),
    "Google Satelite": L.tileLayer("//{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
        maxZoom: maxZoom,
        minZoom: minZoom,
        noWrap: true,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: "&copy; <a href='//www.google.com/'>2023 Google</a>"
    }),
    "Ersi Satelite": L.tileLayer("//server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: maxZoom,
        minZoom: minZoom,
        noWrap: true,
        attribution: "&copy; <a href='//www.esri.com/'>2023 Esri</a>"
    }),
};

const overlays = {};

const gpsOptions = {
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 27000,
};

const mapOptions = {
    zoom: 4,
    layers: layers["OSM Default"],
    maxBoundsViscosity: 0.75,
    fullscreenControl: true,
    fullscreenControlOptions: {
        position: "topleft"
    }
}

let user = {
    name: "User",
    position: new L.LatLng(0, 0),
    heading: 0,
    accuracy: 0,
    speed: 0,
    method: "None",
    compassHeadingEnabled: false,
    visual: {
        marker: null,
        accuracy: null
    }
};

let isHoming = false;
let hasMoved = false;

function updateMarkerPopup(object) {
    object.visual.marker.bindPopup(`<h1>${object.name}</h1><p>Position: ${object.position.lat} lat, ${object.position.lng} lng</p><p>Heading: ${Math.round(object.heading)}°</p><p>Accuracy: ${Math.round(object.accuracy)} m</p><p>Speed: ${object.speed.toFixed(2)} m/s</p><p>Method: ${object.method}</p><p>Compass: ${object.compassHeadingEnabled ? "Enabled" : "Disabled"}</p>`);
}

function createUserMarkers(map) {
    const userMarker = L.marker([0, 0], { icon: icons.userMarker }).addTo(map);
    const userAccuracy = L.circle([0, 0], { color: "blue", fillColor: "#0af", fillOpacity: 0.5, radius: 0 }).addTo(map);

    userMarker.bindPopup("Loading");

    return [userMarker, userAccuracy];
}

function setMarkerAndAccuracy(object) {
    object.visual.marker.setLatLng(object.position).setRotationAngle(object.heading);
    object.visual.accuracy.setLatLng(object.position).setRadius(object.accuracy);
    updateMarkerPopup(object);
}

function updateUserPositionGPS(map, position, moveMode = 0) {
    const userLatLng = new L.LatLng(position.coords.latitude, position.coords.longitude);

    if (isHoming) {
        return;
    }

    switch (moveMode) {
        case 1:
            map.setView(userLatLng, 15);
            break;
        case 2:
            map.panTo(user.position);
            break;
    }

    Object.assign(user, {
        position: userLatLng,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || 0,
        method: "GPS",
    });

    if (!user.compassHeadingEnabled) {
        user.heading = position.coords.heading || 0;
    }

    setMarkerAndAccuracy(user);
}

function updateUserPositionIP(map, forceMove = false) {
    const fetchURL = "https://geoip.nozbe.com/json/";

    fetch(fetchURL)
        .then((response) => response.json())
        .then((data) => {
            const userLatLng = new L.LatLng((data.latitude), (data.longitude));

            if (user.method == "GPS" || isHoming) {
                return;
            }

            if (forceMove) {
                map.setView(userLatLng, 15);
            }

            Object.assign(user, {
                position: userLatLng,
                accuracy: 0,
                speed: 0,
                method: "IP"
            });

            if (!user.compassHeadingEnabled) {
                user.heading = 0;
            }

            setMarkerAndAccuracy(user);
        });
}

function main() {
    const corner1 = L.latLng(-90, -180);
    const corner2 = L.latLng(90, 180);
    const bounds = L.latLngBounds(corner1, corner2);

    Object.assign(mapOptions, {
        center: bounds.getCenter(),
        maxBounds: bounds,
    })
    const map = L.map("map", mapOptions);

    L.control.layers(layers, overlays).addTo(map);
    L.control.scale().addTo(map);

    L.easyButton("fa fa-solid fa-house", (btn, map) => {
        map.flyTo(user.position, 15);
        isHoming = true;
    }, "Go Home").addTo(map);

    L.easyButton({
        states: [{
            stateName: "lock-screen",
            icon: "fa-solid fa-unlock",
            title: "Lock Screen Wake",
            onClick: async function(btn) {
                if (await screenLock.getScreenLock()) {
                    btn.state("unlock-screen");
                }
            }
        }, {
            stateName: "unlock-screen",
            icon: "fa-solid fa-lock",
            title: "Unlock Screen Wake",
            onClick: (btn) => {
                screenLock.releaseScreenLock();
                btn.state("lock-screen");
            }
        }]
    }).addTo(map);

    map.on("zoomend", _ => {
        if (isHoming) {
            isHoming = false;
            hasMoved = false;
        }
    });

    map.on("dragstart", _ => {
        hasMoved = true;
    });

    map.on("dragend", (event) => {
        const distance = util.getDistancePX(event.target, event.target.getCenter(), user.position);

        if (distance < 45) {
            map.panTo(user.position);
            hasMoved = false;
        }
    });

    let userMarker, userAccuracy;
    [userMarker, userAccuracy] = createUserMarkers(map);
    Object.assign(user.visual, {
        marker: userMarker,
        accuracy: userAccuracy,
    });

    updateUserPositionIP(map, !hasMoved);
    if ("geolocation" in navigator && navigator.permissions.query({ name: "geolocation" })) {
        let firstMove = true;

        navigator.geolocation.watchPosition((position) => {
            const moveMode = hasMoved ? 0 : (firstMove ? 1 : 2);
            updateUserPositionGPS(map, position, moveMode);
            firstMove = false;
        }, null, gpsOptions);
    }

    if (compass.needsPermission) {
        L.easyButton("fa-solid fa-compass", () => {
            compass.sendPermissionRequest(this.remove.bind(this), _ => {
                alert("Bruh");
            }, _ => {
                alert("Compass is not supported");
            });
        }).addTo(map);
    }

    compass.addCallback((heading) => {
        Object.assign(user, {
            compassHeadingEnabled: true,
            heading: heading,
        });
        setMarkerAndAccuracy(user);
    });
}