// Express Weather Router

const express = require('express');
const { getWeatherForecast } = require('../services/weatherService');

const router = express.Router();

/**
 * POST /api/weather
 * Request body: { query: "weather in Delhi" } or { query: "" }
 */
router.post('/', async (req, res) => {
  const { query = '' } = req.body || {};

  try {
    const result = await getWeatherForecast(query);
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[WeatherRoutes] Error fetching forecast:', err);
    return res.status(500).json({
      success: false,
      error: { message: 'Weather service currently unavailable. Please try again.' },
    });
  }
});

module.exports = router;
