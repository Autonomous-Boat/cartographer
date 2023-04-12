function normalizeAngle(angle) {
    return (angle % 360 + 360) % 360
}

function getDistancePX(map, location1, location2) {
    var p1 = map.latLngToContainerPoint(location1);
    var p2 = map.latLngToContainerPoint(location2);

    var a = p1.x - p2.x;
    var b = p1.y - p2.y;

    return Math.sqrt(a * a + b * b);
}

export default {
    normalizeAngle: normalizeAngle,
    getDistancePX: getDistancePX
}