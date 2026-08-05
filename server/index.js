// Express Backend Server Entrypoint

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables if .env file exists
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  // dotenv not installed or .env not present
}

const imageRoutes = require('./routes/imageRoutes');
const codeAssistantRoutes = require('./routes/codeAssistantRoutes');
const weatherRoutes = require('./routes/weatherRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Mount Routes
app.use('/api/images', imageRoutes);
app.use('/api/code-assistant', codeAssistantRoutes);
app.use('/api/weather', weatherRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    imageProvider: process.env.IMAGE_API_PROVIDER || 'pollinations-flux',
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Nova AI Server] Express backend running on http://localhost:${PORT}`);
    console.log(`[Nova AI Server] Image Provider: ${process.env.IMAGE_API_PROVIDER || 'pollinations-flux (default zero-key)'}`);
  });
}

module.exports = app;
