# Ski Resort Snow Data Collection

Automated daily collection and visualization of ski resort snow conditions using the [Grib Stream Weather API](https://gribstream.com).

## Features

- **Daily Automated Data Collection**: GitHub Actions workflow runs once daily to fetch snow data
- **20+ Ski Resorts**: Covers major ski resorts across North America
- **Comprehensive Snow Metrics**:
  - 24-hour snowfall accumulation
  - Current snow depth
  - Snow cover percentage
  - Temperature
  - Water equivalent of snow
  - Categorical snow indicator
- **Interactive Web Dashboard**: Beautiful GitHub Pages site to view all data
- **Historical Data**: All daily snapshots are saved and versioned in the repository

## Data Sources

This project uses the **HRRR (High-Resolution Rapid Refresh)** model from Grib Stream, which provides:
- High spatial resolution weather forecasts
- Short-range predictions (0-48 hours)
- Detailed snow and precipitation data

### Snow Parameters Collected

| Parameter | Description | Unit |
|-----------|-------------|------|
| ASNOW | Total Snowfall (24h) | meters / inches |
| SNOD | Snow Depth | meters / inches |
| SNOWC | Snow Cover | percentage |
| WEASD | Water Equivalent of Snow | kg/m² |
| TMP | Surface Temperature | Kelvin / Fahrenheit |
| APCP | Total Precipitation | kg/m² |
| CSNOW | Categorical Snow | binary |

## Project Structure

```
.
├── ski_resorts.json          # Database of ski resort locations
├── fetch_snow_data.js        # Data collection script
├── package.json              # Node.js dependencies
├── data/                     # Historical snow data (JSON)
│   ├── latest.json          # Most recent data
│   ├── index.json           # Index of all available dates
│   └── snow_data_YYYY-MM-DD.json  # Daily snapshots
├── docs/                     # GitHub Pages site
│   └── index.html           # Web dashboard
└── .github/workflows/
    ├── fetch-snow-data.yml  # Daily data collection workflow
    └── deploy-pages.yml     # GitHub Pages deployment
```

## Setup

### Prerequisites

- GitHub repository with Actions enabled
- Grib Stream API key (stored as `GRIB_KEY` secret)
- GitHub Pages enabled

### Configuration

1. **Add API Key Secret**:
   - Go to repository Settings → Secrets and variables → Actions
   - Create a new secret named `GRIB_KEY`
   - Paste your Grib Stream API key

2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Set Source to "GitHub Actions"

3. **Configure Workflows**:
   - The data collection workflow runs daily at 6 AM UTC
   - Manual runs can be triggered via the Actions tab
   - GitHub Pages deploys automatically on push to claude branches

## Usage

### Manual Data Collection

Trigger a manual data collection:

```bash
# Via GitHub Actions UI
Go to Actions → Fetch Ski Resort Snow Data → Run workflow

# Or locally
export GRIB_KEY="your-api-key"
node fetch_snow_data.js
```

### View the Dashboard

Once deployed, your GitHub Pages site will be available at:
```
https://[username].github.io/gribstream_resort_snow_collection/
```

Features:
- Sort by snowfall, depth, temperature, or name
- Filter by state/province
- Search for specific resorts
- Real-time last updated timestamp
- Responsive design for mobile and desktop

## Ski Resorts Included

### United States
- **Colorado**: Vail, Aspen Snowmass, Breckenridge, Telluride, Steamboat
- **Utah**: Park City, Alta, Snowbird
- **Wyoming**: Jackson Hole
- **Montana**: Big Sky
- **California**: Mammoth Mountain, Palisades Tahoe
- **Vermont**: Stowe, Killington
- **Maine**: Sunday River
- **New Mexico**: Taos
- **Oregon**: Mount Bachelor

### Canada
- **British Columbia**: Whistler Blackcomb
- **Alberta**: Lake Louise, Banff Sunshine

## Adding More Resorts

To add additional ski resorts, edit `ski_resorts.json`:

```json
{
  "name": "Resort Name",
  "state": "State/Province",
  "country": "Country",
  "lat": 12.3456,
  "lon": -98.7654
}
```

## Data Format

### Latest Data (`data/latest.json`)

```json
{
  "timestamp": "2025-11-12T06:00:00Z",
  "model": "hrrr",
  "resorts": [
    {
      "name": "Vail",
      "state": "Colorado",
      "country": "USA",
      "coordinates": {
        "lat": 39.6403,
        "lon": -106.3742
      },
      "snow": {
        "snowfall_m": 0.15,
        "snowfall_inches": 5.9,
        "snow_depth_m": 1.2,
        "snow_depth_inches": 47.2,
        "snow_cover_percent": 100,
        "water_equivalent_kg_m2": 300,
        "temperature_k": 268.15,
        "temperature_f": 23,
        "precipitation_kg_m2": 5.2,
        "categorical_snow": 1
      }
    }
  ]
}
```

## Workflows

### Daily Data Collection (`fetch-snow-data.yml`)

- **Schedule**: Daily at 6 AM UTC
- **Actions**:
  1. Fetch snow data from Grib Stream API
  2. Save to `data/` directory
  3. Commit and push changes
  4. Upload as artifact (90-day retention)

### GitHub Pages Deployment (`deploy-pages.yml`)

- **Trigger**: Push to any `claude/**` branch
- **Actions**:
  1. Build site from `docs/` directory
  2. Include latest `data/` files
  3. Deploy to GitHub Pages

## Troubleshooting

### Data Not Loading

If the dashboard shows "Unable to load data":
1. Check that the first data collection workflow has run
2. Verify `GRIB_KEY` secret is set correctly
3. Check workflow logs in the Actions tab
4. Ensure GitHub Pages is enabled and deployed

### API Rate Limits

The Grib Stream API may have rate limits. The workflow:
- Runs once per day to minimize API calls
- Fetches data for all resorts in a single request
- Implements error handling and retries

## License

MIT

## Credits

- Weather data provided by [Grib Stream](https://gribstream.com)
- HRRR model data from NOAA
- Built with GitHub Actions and GitHub Pages
