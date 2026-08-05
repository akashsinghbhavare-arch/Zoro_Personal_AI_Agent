// Weather Service powered by Open-Meteo & NVIDIA NIM API

const WMO_WEATHER_CODES = {
  0: '☀️ Clear sky',
  1: '🌤️ Mainly clear',
  2: '⛅ Partly cloudy',
  3: '☁️ Overcast',
  45: '🌫️ Foggy',
  48: '🌫️ Depositing rime fog',
  51: '🌧️ Light drizzle',
  53: '🌧️ Moderate drizzle',
  55: '🌧️ Dense drizzle',
  61: '🌧️ Slight rain',
  63: '🌧️ Moderate rain',
  65: '🌧️ Heavy rain',
  71: '❄️ Slight snow fall',
  73: '❄️ Moderate snow fall',
  75: '❄️ Heavy snow fall',
  80: '🌦️ Light rain showers',
  81: '🌦️ Moderate rain showers',
  82: '🌧️ Violent rain showers',
  95: '⛈️ Thunderstorm',
  96: '⛈️ Thunderstorm with light hail',
  99: '⛈️ Thunderstorm with heavy hail',
};

/**
 * Get location from IP address if no city provided
 */
async function getLocationFromIP() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.city && data.latitude && data.longitude) {
        return {
          city: data.city,
          region: data.region || data.region_code || '',
          country: data.country_name || data.country || '',
          latitude: data.latitude,
          longitude: data.longitude,
        };
      }
    }
  } catch (err) {
    console.warn('[WeatherService] IP Geolocation primary failed, trying fallback:', err.message);
  }

  // Fallback IP Geolocation
  try {
    const res = await fetch('http://ip-api.com/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return {
          city: data.city,
          region: data.regionName || '',
          country: data.country || '',
          latitude: data.lat,
          longitude: data.lon,
        };
      }
    }
  } catch (err) {
    console.warn('[WeatherService] IP Geolocation fallback failed:', err.message);
  }

  // Default location fallback
  return {
    city: 'New Delhi',
    region: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
  };
}

/**
 * Geocode city name to lat/long
 */
async function geocodeLocation(cityName) {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          city: item.name,
          region: item.admin1 || '',
          country: item.country || '',
          latitude: item.latitude,
          longitude: item.longitude,
        };
      }
    }
  } catch (err) {
    console.warn('[WeatherService] Geocoding failed:', err.message);
  }
  return null;
}

/**
 * Fetch Open-Meteo weather data
 */
async function fetchWeatherData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo weather API error (${res.status})`);
  }
  return await res.json();
}

/**
 * Process weather data via NVIDIA LLM API
 */
async function processWeatherWithNvidia(locationInfo, weatherRaw, userPrompt = '') {
  const apiKey = process.env.NVIDIA_WEATHER_API_KEY || process.env.NVIDIA_API_KEY;
  const current = weatherRaw.current || {};
  const daily = weatherRaw.daily || {};

  const currentCondition = WMO_WEATHER_CODES[current.weather_code] || 'Unknown';
  const locationStr = [locationInfo.city, locationInfo.region, locationInfo.country].filter(Boolean).join(', ');

  const summaryData = {
    location: locationStr,
    currentTemperature: `${current.temperature_2m} °C (Feels like ${current.apparent_temperature} °C)`,
    condition: currentCondition,
    humidity: `${current.relative_humidity_2m}%`,
    windSpeed: `${current.wind_speed_10m} km/h`,
    precipitation: `${current.precipitation} mm`,
    cloudCover: `${current.cloud_cover}%`,
    todayMaxMin: daily.temperature_2m_max?.[0] ? `High: ${daily.temperature_2m_max[0]}°C, Low: ${daily.temperature_2m_min[0]}°C` : 'N/A',
    maxUVIndex: daily.uv_index_max?.[0] ?? 'N/A',
    rainProbability: daily.precipitation_probability_max?.[0] ? `${daily.precipitation_probability_max[0]}%` : 'N/A',
    forecast: (daily.time || []).slice(0, 3).map((date, idx) => ({
      date,
      condition: WMO_WEATHER_CODES[daily.weather_code?.[idx]] || 'Clear',
      maxTemp: `${daily.temperature_2m_max?.[idx]}°C`,
      minTemp: `${daily.temperature_2m_min?.[idx]}°C`,
      rainChance: `${daily.precipitation_probability_max?.[idx] || 0}%`,
    })),
  };

  if (!apiKey) {
    return generateFallbackWeatherReport(locationInfo, summaryData);
  }

  // Call NVIDIA NIM API to synthesize professional response
  const invokeUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
  const systemPrompt = `You are Nova AI Weather Intelligence. You provide clear, accurate, and friendly weather updates.
MANDATORY FORMAT RULE: You MUST start your response text directly with: "The weather in [Location] is [Condition], with a temperature of [Current Temp]..."
Always state the location clearly, followed by current temperature, feels-like temp, condition, humidity, wind, UV index, and a brief 3-day forecast summary. Use clean markdown styling with emoji icons.`;

  const userContent = `User Asked: "${userPrompt || 'What is the weather forecast?'}"

Live Weather Data for ${locationStr}:
${JSON.stringify(summaryData, null, 2)}

Please provide the weather report for the user starting with "The weather in ${locationStr} is..."`;

  try {
    const res = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.3-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 512,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        let finalReport = content.trim();
        if (!finalReport.toLowerCase().startsWith('the weather')) {
          finalReport = `The weather in **${locationStr}** is **${summaryData.condition}**, with a temperature of **${summaryData.currentTemperature}**.\n\n` + finalReport;
        }
        return {
          location: locationStr,
          raw: summaryData,
          report: finalReport,
          provider: 'nvidia-llm-weather',
        };
      }
    } else {
      console.warn('[WeatherService] NVIDIA LLM response not ok:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[WeatherService] NVIDIA LLM call error:', err.message);
  }

  return generateFallbackWeatherReport(locationInfo, summaryData);
}

function generateFallbackWeatherReport(locationInfo, data) {
  const locationStr = data.location;

  const report = `The weather in **${locationStr}** is **${data.condition}**, with a current temperature of **${data.currentTemperature}**.

* 🌡️ **Condition:** ${data.condition}
* 📊 **Today's High / Low:** ${data.todayMaxMin}
* 💧 **Humidity:** ${data.humidity}
* 💨 **Wind Speed:** ${data.windSpeed}
* 🌧️ **Chance of Rain:** ${data.rainProbability}
* ☀️ **UV Index:** ${data.maxUVIndex}

---
#### 📅 3-Day Forecast
${data.forecast.map(f => `- **${f.date}**: ${f.condition} | High: ${f.maxTemp} / Low: ${f.minTemp} (Rain: ${f.rainChance})`).join('\n')}
`;

  return {
    location: locationStr,
    raw: data,
    report,
    provider: 'open-meteo-direct',
  };
}

/**
 * Main Weather Service Entrypoint
 */
async function getWeatherForecast(query = '') {
  let locationInfo = null;

  // 1. Extract potential city name from query
  const cityMatch = query.match(/(?:weather|forecast|temperature|climate|in|at|for)\s+([a-zA-Z\s]{2,40})/i);
  let requestedCity = cityMatch ? cityMatch[1].trim() : '';

  // Clean up common filler words
  requestedCity = requestedCity
    .replace(/\b(today|tomorrow|now|currently|outside|this week|right now|forecast|weather)\b/gi, '')
    .trim();

  if (requestedCity && requestedCity.length > 2) {
    locationInfo = await geocodeLocation(requestedCity);
  }

  // 2. If city not specified or geocoding failed, use IP location
  if (!locationInfo) {
    console.log('[WeatherService] No explicit location found in query, fetching current IP location...');
    locationInfo = await getLocationFromIP();
  }

  console.log(`[WeatherService] Fetching weather forecast for: ${locationInfo.city}, ${locationInfo.country}`);

  // 3. Fetch live weather
  const weatherRaw = await fetchWeatherData(locationInfo.latitude, locationInfo.longitude);

  // 4. Process & format via NVIDIA API
  return await processWeatherWithNvidia(locationInfo, weatherRaw, query);
}

module.exports = {
  getWeatherForecast,
  getLocationFromIP,
  geocodeLocation,
};
