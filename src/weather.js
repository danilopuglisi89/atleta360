// Meteo sull'evento del giorno — Open-Meteo, gratuito e senza chiave API.
// Due chiamate: geocodifica del luogo (una volta, poi in cache) e previsione
// del giorno. Se qualcosa fallisce (luogo non riconosciuto, offline), niente
// meteo: mai bloccare il resto della card per questo.
const WEATHER_CODE = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️",
  61: "🌧️", 63: "🌧️", 65: "🌧️",
  71: "🌨️", 73: "🌨️", 75: "🌨️",
  80: "🌦️", 81: "🌧️", 82: "⛈️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

const geocodeCache = new Map();

async function geocode(place) {
  if (geocodeCache.has(place)) return geocodeCache.get(place);
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=it`);
    const data = await res.json();
    const hit = data?.results?.[0];
    const coords = hit ? { lat: hit.latitude, lon: hit.longitude } : null;
    geocodeCache.set(place, coords);
    return coords;
  } catch {
    return null;
  }
}

// Ritorna { emoji, tempMax } per la data dell'evento, o null se non disponibile
// (Open-Meteo copre solo ~16 giorni avanti: oltre, niente previsione).
export async function weatherFor(place, isoDate) {
  if (!place) return null;
  const coords = await geocode(place);
  if (!coords) return null;
  const day = isoDate.slice(0, 10);
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}` +
      `&daily=weathercode,temperature_2m_max&timezone=Europe%2FRome&start_date=${day}&end_date=${day}`
    );
    const data = await res.json();
    const code = data?.daily?.weathercode?.[0];
    const tempMax = data?.daily?.temperature_2m_max?.[0];
    if (code === undefined) return null;
    return { emoji: WEATHER_CODE[code] || "🌡️", tempMax: Math.round(tempMax) };
  } catch {
    return null;
  }
}
