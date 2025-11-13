#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const API_KEY = process.env.GRIB_KEY;
const BASE_URL = 'https://gribstream.com/api/v2';
const MODEL = 'hrrr'; // High-Resolution Rapid Refresh model
const DATA_DIR = path.join(__dirname, 'data');
const RESORTS_FILE = path.join(__dirname, 'ski_resorts.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Snow-related variables to fetch from HRRR model
const SNOW_VARIABLES = [
  { name: 'ASNOW', level: 'surface' },  // Total Snowfall (m)
  { name: 'SNOD', level: 'surface' },   // Snow Depth (m)
  { name: 'SNOWC', level: 'surface' },  // Snow Cover (%)
  { name: 'WEASD', level: 'surface' }, // Water Equivalent of Accumulated Snow Depth (kg/m^2)
  { name: 'TMP', level: 'surface' },    // Temperature (K)
  { name: 'APCP', level: 'surface' },   // Total Precipitation (kg/m^2)
  { name: 'CSNOW', level: 'surface' }   // Categorical Snow
];

async function fetchSnowData() {
  if (!API_KEY) {
    console.error('Error: GRIB_KEY environment variable not set');
    process.exit(1);
  }

  console.log('Loading ski resorts...');
  const resorts = JSON.parse(fs.readFileSync(RESORTS_FILE, 'utf8'));
  console.log(`Found ${resorts.length} ski resorts`);

  // Prepare coordinates for API request
  const coordinates = resorts.map(resort => ({
    lat: resort.lat,
    lon: resort.lon,
    name: resort.name
  }));

  // Get current time and set time range (last 24 hours of data)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const requestBody = {
    fromTime: yesterday.toISOString(),
    untilTime: now.toISOString(),
    coordinates: coordinates,
    variables: SNOW_VARIABLES
  };

  console.log('Fetching snow data from Grib Stream API...');
  console.log(`Time range: ${requestBody.fromTime} to ${requestBody.untilTime}`);

  try {
    const response = await fetch(`${BASE_URL}/${MODEL}/history`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}): ${errorText}`);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Data received successfully');
    console.log('API Response sample:', JSON.stringify(data).substring(0, 500));
    console.log('API Response type:', Array.isArray(data) ? 'Array' : typeof data);
    if (Array.isArray(data) && data.length > 0) {
      console.log('First item keys:', Object.keys(data[0]));
    } else if (typeof data === 'object') {
      console.log('Response keys:', Object.keys(data));
    }

    // Process and organize the data
    const processedData = processSnowData(data, resorts);

    // Save the processed data
    const timestamp = now.toISOString();
    const filename = `snow_data_${now.toISOString().split('T')[0]}.json`;
    const filepath = path.join(DATA_DIR, filename);

    const dataToSave = {
      timestamp: timestamp,
      model: MODEL,
      resorts: processedData
    };

    fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2));
    console.log(`Data saved to ${filepath}`);

    // Also save as latest.json for easy access
    const latestPath = path.join(DATA_DIR, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(dataToSave, null, 2));
    console.log(`Latest data saved to ${latestPath}`);

    // Update the index of all data files
    updateDataIndex();

    console.log('✓ Snow data fetch completed successfully');
    return processedData;

  } catch (error) {
    console.error('Error fetching snow data:', error.message);
    throw error;
  }
}

function processSnowData(apiData, resorts) {
  // Convert API response to a more user-friendly format
  console.log('Processing data for', resorts.length, 'resorts');

  const processedResorts = resorts.map((resort, index) => {
    const resortData = {
      name: resort.name,
      state: resort.state,
      country: resort.country,
      coordinates: {
        lat: resort.lat,
        lon: resort.lon
      },
      snow: {}
    };

    // Extract data for this resort from the API response
    // The API response format may vary, so we'll handle it flexibly
    if (Array.isArray(apiData)) {
      // Find data matching this resort's coordinates (with tolerance for floating point comparison)
      const matchingData = apiData.filter(item => {
        const latMatch = Math.abs((item.lat || item.latitude) - resort.lat) < 0.01;
        const lonMatch = Math.abs((item.lon || item.longitude || item.lng) - resort.lon) < 0.01;
        return latMatch && lonMatch;
      });

      if (matchingData.length > 0) {
        console.log(`Found ${matchingData.length} data points for ${resort.name}`);
        // Use the most recent data point
        const latestData = matchingData[matchingData.length - 1];

        // Extract snow metrics - try both uppercase and lowercase field names
        resortData.snow = {
          snowfall_m: latestData.ASNOW || latestData.asnow || 0,
          snowfall_inches: (latestData.ASNOW || latestData.asnow || 0) * 39.3701,
          snow_depth_m: latestData.SNOD || latestData.snod || 0,
          snow_depth_inches: (latestData.SNOD || latestData.snod || 0) * 39.3701,
          snow_cover_percent: latestData.SNOWC || latestData.snowc || 0,
          water_equivalent_kg_m2: latestData.WEASD || latestData.weasd || 0,
          temperature_k: latestData.TMP || latestData.tmp || 0,
          temperature_f: (latestData.TMP || latestData.tmp) ? ((latestData.TMP || latestData.tmp) - 273.15) * 9/5 + 32 : 0,
          precipitation_kg_m2: latestData.APCP || latestData.apcp || 0,
          categorical_snow: latestData.CSNOW || latestData.csnow || 0,
          forecast_time: latestData.forecastTime || latestData.validTime || latestData.time
        };
      } else {
        console.log(`No matching data found for ${resort.name}`);
      }
    } else if (apiData && typeof apiData === 'object') {
      // Handle nested object structure
      console.log('API data is an object, not an array. Keys:', Object.keys(apiData));
      // Try to find data in common nested structures
      if (apiData.data && Array.isArray(apiData.data)) {
        return processSnowData(apiData.data, resorts);
      } else if (apiData.results && Array.isArray(apiData.results)) {
        return processSnowData(apiData.results, resorts);
      }
    }

    return resortData;
  });

  return processedResorts;
}

function updateDataIndex() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('snow_data_') && f.endsWith('.json'))
    .sort()
    .reverse();

  const index = {
    last_updated: new Date().toISOString(),
    available_dates: files.map(f => {
      const match = f.match(/snow_data_(.+)\.json/);
      return match ? match[1] : null;
    }).filter(d => d !== null)
  };

  fs.writeFileSync(
    path.join(DATA_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  );
}

// Run the fetch if this script is executed directly
if (require.main === module) {
  fetchSnowData()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fetchSnowData };
