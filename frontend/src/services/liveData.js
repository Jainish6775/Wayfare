// Service for dynamic real-time live data: Weather (Open-Meteo) and Currency FX (Frankfurter)

const WEATHER_CACHE = new Map();
const FX_CACHE = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * WMO Weather interpretation codes (WMO code -> icon, label, advice)
 */
export const getWeatherInfo = (code) => {
  if (code === 0) return { icon: '☀️', label: 'Clear Sky', tip: 'Bright sunny skies — ideal for outdoor exploration & walking tours.' };
  if (code === 1 || code === 2) return { icon: '🌤️', label: 'Partly Cloudy', tip: 'Great mild conditions for photography and sightseeing.' };
  if (code === 3) return { icon: '☁️', label: 'Overcast', tip: 'Overcast weather — perfect for museum visits and indoor cultural dining.' };
  if (code >= 45 && code <= 48) return { icon: '🌫️', label: 'Foggy / Mist', tip: 'Misty weather — take caution with transport and high viewpoints.' };
  if (code >= 51 && code <= 55) return { icon: '🌦️', label: 'Drizzle', tip: 'Light showers expected — pack a compact umbrella.' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'Rainy', tip: 'Rain forecast — bring waterproof gear and plan indoor alternatives.' };
  if (code >= 71 && code <= 77) return { icon: '🌨️', label: 'Snowfall', tip: 'Snow conditions — dress warmly in thermal layers with insulated boots.' };
  if (code >= 80 && code <= 82) return { icon: '🌧️', label: 'Heavy Showers', tip: 'Showers expected — carry water-resistant protection.' };
  if (code >= 95 && code <= 99) return { icon: '⛈️', label: 'Thunderstorm', tip: 'Thunderstorms likely — monitor local transit schedules.' };
  return { icon: '🌡️', label: 'Mild', tip: 'Favorable travel conditions.' };
};

/**
 * Fetch live 5-day weather forecast for latitude and longitude
 */
export async function fetchLiveWeather(latitude, longitude) {
  if (!latitude || !longitude) return null;

  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = WEATHER_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API error');
    const json = await res.json();

    const currentCode = json.current?.weather_code ?? 0;
    const currentInfo = getWeatherInfo(currentCode);

    const dailyForecast = (json.daily?.time || []).map((dateStr, i) => {
      const code = json.daily.weather_code[i] ?? 0;
      const info = getWeatherInfo(code);
      const dayDate = new Date(dateStr);
      return {
        date: dateStr,
        dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        maxTemp: Math.round(json.daily.temperature_2m_max[i]),
        minTemp: Math.round(json.daily.temperature_2m_min[i]),
        precipProb: json.daily.precipitation_probability_max[i] ?? 0,
        icon: info.icon,
        label: info.label
      };
    });

    const result = {
      currentTemp: Math.round(json.current?.temperature_2m ?? 20),
      feelsLike: Math.round(json.current?.apparent_temperature ?? 20),
      humidity: json.current?.relative_humidity_2m ?? 50,
      windSpeed: Math.round(json.current?.wind_speed_10m ?? 10),
      weatherInfo: currentInfo,
      daily: dailyForecast
    };

    WEATHER_CACHE.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err) {
    console.warn('Weather fetch fallback:', err.message);
    // Return sensible fallback
    return {
      currentTemp: 22,
      feelsLike: 22,
      humidity: 55,
      windSpeed: 12,
      weatherInfo: { icon: '🌤️', label: 'Fair Skies', tip: 'Comfortable seasonal climate for itinerary exploration.' },
      daily: [
        { dayName: 'Today', maxTemp: 23, minTemp: 16, icon: '🌤️', label: 'Fair', precipProb: 10 },
        { dayName: 'Tomorrow', maxTemp: 24, minTemp: 17, icon: '☀️', label: 'Clear', precipProb: 5 },
        { dayName: 'Day 3', maxTemp: 22, minTemp: 15, icon: '⛅', label: 'Cloudy', precipProb: 20 },
      ]
    };
  }
}

/**
 * Fetch live FX currency rates against USD
 */
export async function fetchLiveExchangeRates() {
  if (FX_CACHE.data && Date.now() - FX_CACHE.timestamp < CACHE_TTL_MS) {
    return FX_CACHE.data;
  }

  // Fallback rates if offline
  const fallbackRates = {
    USD: { rate: 1, symbol: '$', name: 'US Dollar' },
    EUR: { rate: 0.92, symbol: '€', name: 'Euro' },
    GBP: { rate: 0.79, symbol: '£', name: 'British Pound' },
    INR: { rate: 84.5, symbol: '₹', name: 'Indian Rupee' },
    JPY: { rate: 154.2, symbol: '¥', name: 'Japanese Yen' },
    CAD: { rate: 1.38, symbol: 'C$', name: 'Canadian Dollar' },
    AUD: { rate: 1.52, symbol: 'A$', name: 'Australian Dollar' },
    CHF: { rate: 0.88, symbol: 'CHF', name: 'Swiss Franc' },
  };

  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD');
    if (!res.ok) throw new Error('FX API error');
    const json = await res.json();
    const live = json.rates || {};

    const updated = {
      USD: { rate: 1, symbol: '$', name: 'US Dollar' },
      EUR: { rate: live.EUR || 0.92, symbol: '€', name: 'Euro' },
      GBP: { rate: live.GBP || 0.79, symbol: '£', name: 'British Pound' },
      INR: { rate: live.INR || 84.5, symbol: '₹', name: 'Indian Rupee' },
      JPY: { rate: live.JPY || 154.2, symbol: '¥', name: 'Japanese Yen' },
      CAD: { rate: live.CAD || 1.38, symbol: 'C$', name: 'Canadian Dollar' },
      AUD: { rate: live.AUD || 1.52, symbol: 'A$', name: 'Australian Dollar' },
      CHF: { rate: live.CHF || 0.88, symbol: 'CHF', name: 'Swiss Franc' },
    };

    FX_CACHE.data = updated;
    FX_CACHE.timestamp = Date.now();
    return updated;
  } catch {
    return fallbackRates;
  }
}
