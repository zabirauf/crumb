---
name: weather-fetch
description: Fetch current weather, forecasts, and weather alerts for any location worldwide. Use this skill whenever the user asks about weather conditions, temperature, forecasts, rain, wind, humidity, UV index, sunrise/sunset times, or any weather-related query. Trigger for queries like "what's the weather in London", "will it rain tomorrow", "5-day forecast for Tokyo", "weather alerts near me", or any location-based weather request. Supports city names, coordinates, ZIP codes, and airport codes.
---

# Weather Fetch Skill

Fetch current weather, forecasts, and weather alerts for any location using free public APIs (no API key required).

## When to Use

- User asks about current weather conditions for a location
- User wants a weather forecast (today, tomorrow, multi-day)
- User asks about specific weather metrics (temperature, wind, humidity, UV, etc.)
- User wants sunrise/sunset times
- User asks about weather alerts or severe weather
- User wants to compare weather between locations

## Primary Method: wttr.in API (No API Key Required)

### Current Weather (Concise)

```bash
# Simple one-line weather
curl -s "wttr.in/London?format=3"

# Custom format: location, condition, temp, feels like, humidity, wind
curl -s "wttr.in/London?format=%l:+%c+%C+%t+(feels+like+%f)+|+Humidity:+%h+|+Wind:+%w+|+UV:+%u+|+Precip:+%p"
```

### Current Weather (Detailed)

```bash
# Full current weather display (terminal-friendly)
curl -s "wttr.in/London?0"

# Quiet mode (no header/footer)
curl -s "wttr.in/London?0Qq"
```

### Forecasts

```bash
# Today + 1-day forecast
curl -s "wttr.in/London?1"

# Today + 2-day forecast
curl -s "wttr.in/London?2"

# Today + 3-day forecast (default max)
curl -s "wttr.in/London?3"

# Quiet narrow forecast
curl -s "wttr.in/London?2Qq"
```

### JSON Output (for programmatic processing)

```bash
# Full JSON weather data
curl -s "wttr.in/London?format=j1" | python3 -m json.tool

# Extract specific fields from JSON
curl -s "wttr.in/London?format=j1" | python3 -c "
import sys, json
data = json.load(sys.stdin)
cur = data['current_condition'][0]
print(f\"🌡️  Temperature: {cur['temp_C']}°C / {cur['temp_F']}°F\")
print(f\"🤔 Feels Like:  {cur['FeelsLikeC']}°C / {cur['FeelsLikeF']}°F\")
print(f\"💧 Humidity:    {cur['humidity']}%\")
print(f\"💨 Wind:        {cur['windspeedKmph']} km/h {cur['winddir16Point']}\")
print(f\"☁️  Cloud Cover: {cur['cloudcover']}%\")
print(f\"🌤️  Condition:   {cur['weatherDesc'][0]['value']}\")
print(f\"👁️  Visibility:  {cur['visibility']} km\")
print(f\"🌡️  Pressure:    {cur['pressure']} mb\")
print(f\"☀️  UV Index:    {cur['uvIndex']}\")
"
```

### Location Formats

```bash
# By city name
curl -s "wttr.in/Paris?format=j1"

# By city + country
curl -s "wttr.in/Paris,France?format=j1"

# By US ZIP code
curl -s "wttr.in/10001?format=j1"

# By coordinates (latitude,longitude)
curl -s "wttr.in/48.8566,2.3522?format=j1"

# By airport code (IATA)
curl -s "wttr.in/JFK?format=j1"

# By landmark/place
curl -s "wttr.in/Eiffel+Tower?format=j1"
```

### Format Codes for Custom Output

| Code | Meaning            |
|------|--------------------|
| %l   | Location           |
| %c   | Weather icon       |
| %C   | Weather condition  |
| %t   | Temperature        |
| %f   | Feels like         |
| %h   | Humidity           |
| %w   | Wind               |
| %p   | Precipitation (mm) |
| %P   | Pressure (mb)      |
| %u   | UV Index           |
| %D   | Dawn               |
| %S   | Sunrise            |
| %z   | Zenith             |
| %s   | Sunset             |
| %d   | Dusk               |
| %T   | Current time       |
| %m   | Moon phase icon    |
| %M   | Moon day           |

### Units

```bash
# Metric (default)
curl -s "wttr.in/London?m"

# US/Imperial
curl -s "wttr.in/London?u"

# Metric wind, Celsius (USCS for wind)
curl -s "wttr.in/London?M"
```

## Helper Script: weather.sh

A convenience script is provided at `./SKILLS/weather-fetch-skill/weather.sh`:

```bash
# Usage:
./SKILLS/weather-fetch-skill/weather.sh current "New York"
./SKILLS/weather-fetch-skill/weather.sh forecast "Tokyo" 3
./SKILLS/weather-fetch-skill/weather.sh detailed "London"
./SKILLS/weather-fetch-skill/weather.sh compare "New York" "London"
./SKILLS/weather-fetch-skill/weather.sh alerts "Miami"
```

## Fallback Method: Open-Meteo API (No API Key Required)

If wttr.in is unavailable, use the Open-Meteo free API:

```bash
# Step 1: Geocode the city name to coordinates
curl -s "https://geocoding-api.open-meteo.com/v1/search?name=London&count=1" | python3 -c "
import sys, json
data = json.load(sys.stdin)
r = data['results'][0]
print(f\"{r['latitude']},{r['longitude']},{r['name']},{r['country']}\")
"

# Step 2: Get weather using coordinates
curl -s "https://api.open-meteo.com/v1/forecast?latitude=51.5085&longitude=-0.1257&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,wind_speed_10m_max&timezone=auto" | python3 -m json.tool
```

## Error Handling

- If a city is not found, wttr.in returns a "not found" message — check for this
- If wttr.in is down, fall back to Open-Meteo API
- Always set `--max-time 10` on curl to avoid hanging
- Handle encoding: use `-s` for silent mode

## Tips

- Use `format=j1` for JSON when you need to process data programmatically
- Use `?0` for just current weather (no forecast)
- Use `?Qq` for quiet mode (removes ASCII art header/footer)
- Append `&lang=XX` for localized output (e.g., `&lang=fr` for French)
- For multiple cities, run commands in parallel or loop
