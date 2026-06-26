import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = { lat: 14.5547, lng: 121.0244 }; // Makati City
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const jobIcon = L.divIcon({
    className: "kaila-leaflet-pin kaila-leaflet-pin--job",
    html: '<span><i class="fa-solid fa-location-dot"></i></span>',
    iconSize: [38, 38],
    iconAnchor: [19, 36],
});

const providerIcon = L.divIcon({
    className: "kaila-leaflet-pin kaila-leaflet-pin--provider",
    html: '<span><i class="fa-solid fa-screwdriver-wrench"></i></span>',
    iconSize: [38, 38],
    iconAnchor: [19, 36],
});

export function renderMapUnavailable(container, message = "Map unavailable. Check your connection and try again.") {
    if (!container) return;
    container.innerHTML = `
        <div class="kaila-map-fallback">
            <i class="fa-solid fa-map-location-dot"></i>
            <span>${message}</span>
        </div>`;
}

export async function initLocationPicker({ mapEl, inputEl, latInput, lngInput, areaInput, initialCenter = DEFAULT_CENTER }) {
    if (!mapEl) return null;

    const center = {
        lat: Number(latInput?.value) || initialCenter.lat,
        lng: Number(lngInput?.value) || initialCenter.lng,
    };

    const mapCanvas = prepareMapCanvas(mapEl);
    const map = L.map(mapCanvas, { zoomControl: false }).setView([center.lat, center.lng], 15);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([center.lat, center.lng], {
        draggable: true,
        icon: jobIcon,
    }).addTo(map);

    const syncPosition = (latLng, address = "") => {
        const lat = Number(latLng.lat);
        const lng = Number(latLng.lng);
        if (latInput) latInput.value = lat.toFixed(7);
        if (lngInput) lngInput.value = lng.toFixed(7);
        if (address && inputEl) inputEl.value = address;
        if (address && areaInput && !areaInput.value) areaInput.value = address;
    };

    const moveMarker = async (latLng, shouldReverse = true) => {
        marker.setLatLng(latLng);
        map.panTo(latLng);
        syncPosition(latLng);
        if (!shouldReverse) return;
        const address = await reverseGeocode(latLng.lat, latLng.lng);
        if (address) syncPosition(latLng, address);
    };

    marker.on("dragend", () => {
        moveMarker(marker.getLatLng()).catch(() => {});
    });

    map.on("click", (event) => {
        moveMarker(event.latlng).catch(() => {});
    });

    if (inputEl) {
        const geocodeInput = async () => {
            const query = inputEl.value.trim();
            if (query.length < 4) return;
            const result = await geocode(query);
            if (!result) return;
            await moveMarker({ lat: result.lat, lng: result.lng }, false);
            syncPosition({ lat: result.lat, lng: result.lng }, result.label);
        };
        inputEl.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                geocodeInput().catch(() => {});
            }
        });
        inputEl.addEventListener("blur", () => {
            geocodeInput().catch(() => {});
        });
    }

    syncPosition(marker.getLatLng(), inputEl?.value || "");
    setTimeout(() => map.invalidateSize(), 50);
    return { map, marker };
}

export async function renderRouteMap(container, { destination, provider, label = "Provider route" } = {}) {
    if (!container) return null;

    const dest = normalizePoint(destination) || DEFAULT_CENTER;
    const from = normalizePoint(provider) || { lat: dest.lat + 0.012, lng: dest.lng - 0.012 };

    const mapCanvas = prepareMapCanvas(container);
    const map = L.map(mapCanvas, { zoomControl: false }).setView([dest.lat, dest.lng], 13);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
    }).addTo(map);

    L.marker([dest.lat, dest.lng], { icon: jobIcon, title: "Job location" }).addTo(map);
    L.marker([from.lat, from.lng], { icon: providerIcon, title: "Provider location" }).addTo(map);

    const route = await fetchRoute(from, dest);
    const points = route?.points?.length ? route.points : [[from.lat, from.lng], [dest.lat, dest.lng]];
    const routeLine = L.polyline(points, {
        color: "#0d6efd",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
    }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [28, 28] });
    container.dataset.mapSummary = route
        ? `${label}: ${formatDistance(route.distance)} · ${formatDuration(route.duration)}`
        : `${label}: route preview`;
    setTimeout(() => map.invalidateSize(), 50);
    return map;
}

export function normalizePoint(point) {
    if (!point) return null;
    const lat = Number(point.lat ?? point.latitude ?? point.provider_lat ?? point.job_lat);
    const lng = Number(point.lng ?? point.longitude ?? point.provider_lng ?? point.job_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

async function geocode(query) {
    const url = new URL(`${NOMINATIM_URL}/search`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "ph");
    url.searchParams.set("q", query);

    const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const [result] = await response.json();
    if (!result) return null;
    return {
        lat: Number(result.lat),
        lng: Number(result.lon),
        label: result.display_name || query,
    };
}

async function reverseGeocode(lat, lng) {
    const url = new URL(`${NOMINATIM_URL}/reverse`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);

    const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
    });
    if (!response.ok) return "";
    const result = await response.json();
    return result.display_name || "";
}

async function fetchRoute(from, dest) {
    const url = `${OSRM_URL}/${from.lng},${from.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    try {
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        if (!response.ok) return null;
        const payload = await response.json();
        const route = payload.routes?.[0];
        const coordinates = route?.geometry?.coordinates || [];
        if (!coordinates.length) return null;
        return {
            distance: route.distance,
            duration: route.duration,
            points: coordinates.map(([lng, lat]) => [lat, lng]),
        };
    } catch {
        return null;
    }
}

function formatDistance(meters = 0) {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds = 0) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `${minutes} min`;
}

function prepareMapCanvas(container) {
    const controls = [...container.querySelectorAll("button")];
    const canvas = document.createElement("div");
    canvas.className = "kaila-leaflet-canvas";
    container.replaceChildren(canvas, ...controls);
    return canvas;
}
