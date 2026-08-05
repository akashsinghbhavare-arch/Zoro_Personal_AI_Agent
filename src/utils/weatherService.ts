// Frontend Weather Service Utility

export interface WeatherResponse {
  success: boolean;
  location?: string;
  report: string;
  provider?: string;
}

const BACKEND_WEATHER_URL = 'http://localhost:3001/api/weather';

/**
 * Client-side fallback if backend server is unreachable
 */
async function fetchClientWeatherFallback(query: string = ''): Promise<WeatherResponse> {
  try {
    let lat = 28.6139;
    let lon = 77.2090;
    let cityStr = 'Current Location';

    // Extract potential city
    const cityMatch = query.match(/(?:weather|forecast|temperature|climate|in|at|for)\s+([a-zA-Z\s]{2,40})/i);
    let city = cityMatch ? cityMatch[1].replace(/\b(today|tomorrow|now|currently|outside|this week|forecast|weather)\b/gi, '').trim() : '';

    if (city && city.length > 2) {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results?.[0]) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
          cityStr = `${geoData.results[0].name}, ${geoData.results[0].country}`;
        }
      }
    } else {
      // IP location
      const ipRes = await fetch('https://ipapi.co/json/').catch(() => null);
      if (ipRes && ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          lat = ipData.latitude;
          lon = ipData.longitude;
          cityStr = `${ipData.city}, ${ipData.country_name}`;
        }
      }
    }

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
    if (res.ok) {
      const data = await res.json();
      const temp = data.current?.temperature_2m;
      const feels = data.current?.apparent_temperature;
      const humidity = data.current?.relative_humidity_2m;
      const wind = data.current?.wind_speed_10m;
      const maxT = data.daily?.temperature_2m_max?.[0];
      const minT = data.daily?.temperature_2m_min?.[0];
      const rain = data.daily?.precipitation_probability_max?.[0] || 0;

      const report = `### 🌤️ Weather Forecast for **${cityStr}**

* 🌡️ **Temperature:** ${temp} °C (Feels like ${feels} °C)
* 📊 **High / Low:** High ${maxT}°C / Low ${minT}°C
* 💧 **Humidity:** ${humidity}%
* 💨 **Wind Speed:** ${wind} km/h
* 🌧️ **Chance of Rain:** ${rain}%
`;

      return {
        success: true,
        location: cityStr,
        report,
        provider: 'open-meteo-client-fallback',
      };
    }
  } catch (err) {
    console.warn('[WeatherClient] Fallback error:', err);
  }

  return {
    success: false,
    report: '⚠️ Weather service is temporarily unavailable. Please try again later.',
  };
}

/**
 * Main Weather Forecast Fetcher
 */
export async function getWeatherForecast(query: string = ''): Promise<WeatherResponse> {
  try {
    const res = await fetch(BACKEND_WEATHER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.report) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[WeatherClient] Backend API call failed, using client fallback:', err);
  }

  return await fetchClientWeatherFallback(query);
}
