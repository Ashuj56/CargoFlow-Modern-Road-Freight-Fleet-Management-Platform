export async function geocodeLocation(queryText) {
  if (!queryText || typeof queryText !== 'string') return null;
  const clean = queryText.trim();
  if (!clean) return null;

  // 1. Try OpenStreetMap Nominatim API
  try {
    const searchQuery = clean.includes('India') ? clean : `${clean}, India`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CargoFlow-App/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim geocode timed out / failed, trying secondary geocoder:', err.message);
  }

  // 2. Fallback to Open-Meteo Free Global Geocoding API (Fast, no API key needed)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          lat: item.latitude,
          lng: item.longitude,
          displayName: `${item.name}${item.admin1 ? ', ' + item.admin1 : ''}${item.country ? ', ' + item.country : ''}`,
        };
      }
    }
  } catch (err) {
    console.warn('Secondary geocoder failed:', err.message);
  }

  return null;
}

/**
 * Calculate Great-Circle Distance (Haversine formula) in km
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const aerialKm = R * c;
  // Road network factor (~1.25x of straight line distance)
  return Math.round(aerialKm * 1.25);
}

/**
 * Calculate real driving road distance and duration using OSRM (Project OSRM)
 * Falls back dynamically to Haversine road calculation if OSRM is offline.
 */
export async function getDrivingDistance(pickupCoords, destCoords) {
  if (!pickupCoords || !destCoords) return null;
  const { lat: pLat, lng: pLng } = pickupCoords;
  const { lat: dLat, lng: dLng } = destCoords;
  if (!pLat || !pLng || !dLat || !dLng) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const distanceKm = Math.max(1, Math.round(route.distance / 1000));
        const durationHours = (route.duration / 3600).toFixed(1);
        return {
          distanceKm,
          durationHours: Number(durationHours),
          source: 'OSRM Live Highway Route',
        };
      }
    }
  } catch (err) {
    console.warn('OSRM router unreachable, falling back to dynamic Haversine distance:', err.message);
  }

  // Fallback calculation using spherical geometry + road winding factor
  const fallbackKm = Math.max(1, haversineDistance(pLat, pLng, dLat, dLng));
  const approxHours = (fallbackKm / 45).toFixed(1); // Avg commercial freight speed 45 km/h
  return {
    distanceKm: fallbackKm,
    durationHours: Number(approxHours),
    source: 'Road Network Estimation',
  };
}
