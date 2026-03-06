#!/bin/bash
# Weather Fetch Helper Script
# Usage: weather.sh <command> <location> [options]
#
# Commands:
#   current  <location>           - Current weather conditions
#   forecast <location> [days]    - Weather forecast (1-3 days, default 3)
#   detailed <location>           - Detailed current weather with all metrics
#   compare  <loc1> <loc2>        - Compare weather between two locations
#   alerts   <location>           - Check for severe weather indicators
#   sun      <location>           - Sunrise/sunset and moon info

set -euo pipefail

COMMAND="${1:-help}"
LOCATION="${2:-}"

# URL encode location
urlencode() {
    python3 -c "import urllib.parse; print(urllib.parse.quote('$1'))"
}

# ── Current Weather ──────────────────────────────────────────────────
cmd_current() {
    local loc
    loc=$(urlencode "$LOCATION")
    echo ""
    echo "┌──────────────────────────────────────────────────────────────┐"
    echo "│  🌤️  CURRENT WEATHER: $LOCATION"
    echo "└──────────────────────────────────────────────────────────────┘"
    echo ""
    
    curl -s --max-time 10 "wttr.in/${loc}?format=j1" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    cur = data['current_condition'][0]
    area = data.get('nearest_area', [{}])[0]
    
    city = area.get('areaName', [{}])[0].get('value', 'N/A')
    country = area.get('country', [{}])[0].get('value', 'N/A')
    region = area.get('region', [{}])[0].get('value', 'N/A')
    
    print(f'  📍 Location:    {city}, {region}, {country}')
    print(f'  🌤️  Condition:   {cur[\"weatherDesc\"][0][\"value\"]}')
    print(f'  🌡️  Temperature: {cur[\"temp_C\"]}°C / {cur[\"temp_F\"]}°F')
    print(f'  🤔 Feels Like:  {cur[\"FeelsLikeC\"]}°C / {cur[\"FeelsLikeF\"]}°F')
    print(f'  💧 Humidity:    {cur[\"humidity\"]}%')
    print(f'  💨 Wind:        {cur[\"windspeedKmph\"]} km/h ({cur[\"windspeedMiles\"]} mph) {cur[\"winddir16Point\"]}')
    print(f'  ☁️  Cloud Cover: {cur[\"cloudcover\"]}%')
    print(f'  👁️  Visibility:  {cur[\"visibility\"]} km')
    print(f'  🌡️  Pressure:    {cur[\"pressure\"]} mb')
    print(f'  ☀️  UV Index:    {cur[\"uvIndex\"]}')
    print(f'  🌧️  Precip:      {cur[\"precipMM\"]} mm')
    print(f'  ⏰ Observed:    {cur[\"observation_time\"]} UTC')
except Exception as e:
    print(f'  ❌ Error: {e}')
    print('  Try a different location name or check spelling.')
"
    echo ""
}

# ── Forecast ─────────────────────────────────────────────────────────
cmd_forecast() {
    local loc days
    loc=$(urlencode "$LOCATION")
    days="${3:-3}"
    
    echo ""
    echo "┌──────────────────────────────────────────────────────────────┐"
    echo "│  📅 ${days}-DAY FORECAST: $LOCATION"
    echo "└──────────────────────────────────────────────────────────────┘"
    echo ""
    
    curl -s --max-time 10 "wttr.in/${loc}?format=j1" | python3 -c "
import sys, json
days = int('${days}')
try:
    data = json.load(sys.stdin)
    forecasts = data.get('weather', [])[:days]
    
    for day in forecasts:
        date = day['date']
        max_c = day['maxtempC']
        min_c = day['mintempC']
        max_f = day['maxtempF']
        min_f = day['mintempF']
        sun_rise = day.get('astronomy', [{}])[0].get('sunrise', 'N/A')
        sun_set = day.get('astronomy', [{}])[0].get('sunset', 'N/A')
        
        print(f'  📅 {date}')
        print(f'     🌡️  High: {max_c}°C / {max_f}°F  |  Low: {min_c}°C / {min_f}°F')
        print(f'     🌅 Sunrise: {sun_rise}  |  🌇 Sunset: {sun_set}')
        
        # Hourly breakdown
        for hour in day.get('hourly', []):
            time = hour['time'].zfill(4)
            time_fmt = f'{time[:2]}:{time[2:]}'
            temp_c = hour['tempC']
            temp_f = hour['tempF']
            desc = hour['weatherDesc'][0]['value']
            rain = hour['chanceofrain']
            wind = hour['windspeedKmph']
            print(f'     ⏰ {time_fmt}  {temp_c}°C/{temp_f}°F  {desc:<25} 🌧️{rain}%  💨{wind}km/h')
        print()
except Exception as e:
    print(f'  ❌ Error: {e}')
"
    echo ""
}

# ── Detailed ─────────────────────────────────────────────────────────
cmd_detailed() {
    local loc
    loc=$(urlencode "$LOCATION")
    
    echo ""
    echo "┌──────────────────────────────────────────────────────────────┐"
    echo "│  🔍 DETAILED WEATHER: $LOCATION"
    echo "└──────────────────────────────────────────────────────────────┘"
    echo ""
    
    curl -s --max-time 10 "wttr.in/${loc}?format=j1" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    cur = data['current_condition'][0]
    area = data.get('nearest_area', [{}])[0]
    today = data.get('weather', [{}])[0]
    astro = today.get('astronomy', [{}])[0]
    
    city = area.get('areaName', [{}])[0].get('value', 'N/A')
    country = area.get('country', [{}])[0].get('value', 'N/A')
    region = area.get('region', [{}])[0].get('value', 'N/A')
    lat = area.get('latitude', 'N/A')
    lon = area.get('longitude', 'N/A')
    
    print(f'  📍 LOCATION')
    print(f'     City:      {city}')
    print(f'     Region:    {region}')
    print(f'     Country:   {country}')
    print(f'     Coords:    {lat}, {lon}')
    print()
    print(f'  🌤️  CONDITIONS')
    print(f'     Weather:     {cur[\"weatherDesc\"][0][\"value\"]}')
    print(f'     Temperature: {cur[\"temp_C\"]}°C / {cur[\"temp_F\"]}°F')
    print(f'     Feels Like:  {cur[\"FeelsLikeC\"]}°C / {cur[\"FeelsLikeF\"]}°F')
    print(f'     High Today:  {today.get(\"maxtempC\",\"?\")}°C / {today.get(\"maxtempF\",\"?\")}°F')
    print(f'     Low Today:   {today.get(\"mintempC\",\"?\")}°C / {today.get(\"mintempF\",\"?\")}°F')
    print()
    print(f'  💨 WIND & ATMOSPHERE')
    print(f'     Wind Speed:    {cur[\"windspeedKmph\"]} km/h ({cur[\"windspeedMiles\"]} mph)')
    print(f'     Wind Dir:      {cur[\"winddir16Point\"]} ({cur[\"winddirDegree\"]}°)')
    print(f'     Humidity:      {cur[\"humidity\"]}%')
    print(f'     Pressure:      {cur[\"pressure\"]} mb')
    print(f'     Cloud Cover:   {cur[\"cloudcover\"]}%')
    print(f'     Visibility:    {cur[\"visibility\"]} km')
    print(f'     UV Index:      {cur[\"uvIndex\"]}')
    print(f'     Precipitation: {cur[\"precipMM\"]} mm')
    print()
    print(f'  🌅 ASTRONOMY')
    print(f'     Sunrise:    {astro.get(\"sunrise\", \"N/A\")}')
    print(f'     Sunset:     {astro.get(\"sunset\", \"N/A\")}')
    print(f'     Moonrise:   {astro.get(\"moonrise\", \"N/A\")}')
    print(f'     Moonset:    {astro.get(\"moonset\", \"N/A\")}')
    print(f'     Moon Phase: {astro.get(\"moon_phase\", \"N/A\")}')
    print(f'     Moon Illum: {astro.get(\"moon_illumination\", \"N/A\")}%')
except Exception as e:
    print(f'  ❌ Error: {e}')
"
    echo ""
}

# ── Compare ──────────────────────────────────────────────────────────
cmd_compare() {
    local loc1 loc2
    loc1=$(urlencode "$LOCATION")
    loc2=$(urlencode "${3:-}")
    
    if [ -z "${3:-}" ]; then
        echo "❌ Error: Please provide two locations to compare."
        echo "   Usage: weather.sh compare \"New York\" \"London\""
        exit 1
    fi
    
    echo ""
    echo "┌──────────────────────────────────────────────────────────────┐"
    echo "│  ⚖️  WEATHER COMPARISON"
    echo "└──────────────────────────────────────────────────────────────┘"
    echo ""
    
    # Fetch both in parallel
    data1=$(curl -s --max-time 10 "wttr.in/${loc1}?format=j1")
    data2=$(curl -s --max-time 10 "wttr.in/${loc2}?format=j1")
    
    python3 -c "
import json

data1 = json.loads('''${data1}''')
data2 = json.loads('''${data2}''')

def get_info(data):
    cur = data['current_condition'][0]
    area = data.get('nearest_area', [{}])[0]
    city = area.get('areaName', [{}])[0].get('value', 'N/A')
    return {
        'city': city,
        'condition': cur['weatherDesc'][0]['value'],
        'temp_c': cur['temp_C'],
        'temp_f': cur['temp_F'],
        'feels_c': cur['FeelsLikeC'],
        'feels_f': cur['FeelsLikeF'],
        'humidity': cur['humidity'],
        'wind_kmh': cur['windspeedKmph'],
        'wind_mph': cur['windspeedMiles'],
        'wind_dir': cur['winddir16Point'],
        'uv': cur['uvIndex'],
        'cloud': cur['cloudcover'],
        'visibility': cur['visibility'],
        'pressure': cur['pressure'],
        'precip': cur['precipMM'],
    }

a = get_info(data1)
b = get_info(data2)

header = f'  {\"Metric\":<20} {a[\"city\"]:>20} {b[\"city\"]:>20}'
sep = f'  {\"-\"*20} {\"-\"*20} {\"-\"*20}'
print(header)
print(sep)
print(f'  {\"Condition\":<20} {a[\"condition\"]:>20} {b[\"condition\"]:>20}')
print(f'  {\"Temperature\":<20} {a[\"temp_c\"]+\"°C/\"+a[\"temp_f\"]+\"°F\":>20} {b[\"temp_c\"]+\"°C/\"+b[\"temp_f\"]+\"°F\":>20}')
print(f'  {\"Feels Like\":<20} {a[\"feels_c\"]+\"°C/\"+a[\"feels_f\"]+\"°F\":>20} {b[\"feels_c\"]+\"°C/\"+b[\"feels_f\"]+\"°F\":>20}')
print(f'  {\"Humidity\":<20} {a[\"humidity\"]+\"%\":>20} {b[\"humidity\"]+\"%\":>20}')
print(f'  {\"Wind\":<20} {a[\"wind_kmh\"]+\" km/h \"+a[\"wind_dir\"]:>20} {b[\"wind_kmh\"]+\" km/h \"+b[\"wind_dir\"]:>20}')
print(f'  {\"UV Index\":<20} {a[\"uv\"]:>20} {b[\"uv\"]:>20}')
print(f'  {\"Cloud Cover\":<20} {a[\"cloud\"]+\"%\":>20} {b[\"cloud\"]+\"%\":>20}')
print(f'  {\"Visibility\":<20} {a[\"visibility\"]+\" km\":>20} {b[\"visibility\"]+\" km\":>20}')
print(f'  {\"Pressure\":<20} {a[\"pressure\"]+\" mb\":>20} {b[\"pressure\"]+\" mb\":>20}')
print(f'  {\"Precipitation\":<20} {a[\"precip\"]+\" mm\":>20} {b[\"precip\"]+\" mm\":>20}')
" 2>/dev/null || echo "  ❌ Error comparing locations. Check spelling."
    echo ""
}

# ── Alerts / Severe Weather Check ────────────────────────────────────
cmd_alerts() {
    local loc
    loc=$(urlencode "$LOCATION")
    
    echo ""
    echo "┌──────────────────────────────────────────────────────────────┐"
    echo "│  ⚠️  WEATHER ALERTS CHECK: $LOCATION"
    echo "└──────────────────────────────────────────────────────────────┘"
    echo ""
    
    curl -s --max-time 10 "wttr.in/${loc}?format=j1" | python3 -c "
import sys, json

try:
    data = json.load(sys.stdin)
    cur = data['current_condition'][0]
    today = data.get('weather', [{}])[0]
    
    alerts = []
    
    # Check UV
    uv = int(cur.get('uvIndex', 0))
    if uv >= 11:
        alerts.append(('🔴 EXTREME', f'UV Index is {uv} — Extreme! Avoid sun exposure.'))
    elif uv >= 8:
        alerts.append(('🟠 VERY HIGH', f'UV Index is {uv} — Very High. Limit sun exposure.'))
    elif uv >= 6:
        alerts.append(('🟡 HIGH', f'UV Index is {uv} — High. Wear sunscreen.'))
    
    # Check wind
    wind = int(cur.get('windspeedKmph', 0))
    if wind >= 90:
        alerts.append(('🔴 HURRICANE', f'Wind speed {wind} km/h — Hurricane force winds!'))
    elif wind >= 60:
        alerts.append(('🟠 STORM', f'Wind speed {wind} km/h — Storm force winds.'))
    elif wind >= 40:
        alerts.append(('🟡 STRONG WIND', f'Wind speed {wind} km/h — Strong winds.'))
    
    # Check visibility
    vis = int(cur.get('visibility', 10))
    if vis <= 1:
        alerts.append(('🔴 DENSE FOG', f'Visibility {vis} km — Dense fog. Dangerous driving.'))
    elif vis <= 4:
        alerts.append(('🟡 LOW VISIBILITY', f'Visibility {vis} km — Reduced visibility.'))
    
    # Check precipitation
    precip = float(cur.get('precipMM', 0))
    if precip >= 50:
        alerts.append(('🔴 HEAVY RAIN', f'Precipitation {precip} mm — Heavy rainfall. Flood risk.'))
    elif precip >= 10:
        alerts.append(('🟡 RAIN', f'Precipitation {precip} mm — Moderate to heavy rain.'))
    
    # Check temperature extremes
    temp = int(cur.get('temp_C', 20))
    feels = int(cur.get('FeelsLikeC', 20))
    if temp >= 40:
        alerts.append(('🔴 EXTREME HEAT', f'Temperature {temp}°C (feels like {feels}°C) — Dangerous heat!'))
    elif temp >= 35:
        alerts.append(('🟠 HEAT', f'Temperature {temp}°C (feels like {feels}°C) — Heat advisory.'))
    elif temp <= -20:
        alerts.append(('🔴 EXTREME COLD', f'Temperature {temp}°C (feels like {feels}°C) — Dangerous cold!'))
    elif temp <= -10:
        alerts.append(('🟠 COLD', f'Temperature {temp}°C (feels like {feels}°C) — Cold advisory.'))
    
    # Check hourly for rain chances
    high_rain_hours = []
    for hour in today.get('hourly', []):
        rain_chance = int(hour.get('chanceofrain', 0))
        if rain_chance >= 70:
            time = hour['time'].zfill(4)
            high_rain_hours.append(f'{time[:2]}:{time[2:]} ({rain_chance}%)')
    
    if high_rain_hours:
        alerts.append(('🌧️  RAIN LIKELY', f'High chance of rain at: {', '.join(high_rain_hours)}'))
    
    # Check for snow
    snow_hours = []
    for hour in today.get('hourly', []):
        snow_chance = int(hour.get('chanceofsnow', 0))
        if snow_chance >= 50:
            time = hour['time'].zfill(4)
            snow_hours.append(f'{time[:2]}:{time[2:]} ({snow_chance}%)')
    
    if snow_hours:
        alerts.append(('❄️  SNOW LIKELY', f'High chance of snow at: {', '.join(snow_hours)}'))
    
    if alerts:
        for level, msg in alerts:
            print(f'  {level}: {msg}')
    else:
        print(f'  ✅ No significant weather alerts for this location.')
        print(f'     Current: {cur[\"weatherDesc\"][0][\"value\"]}, {cur[\"temp_C\"]}°C, Wind {cur[\"windspeedKmph\"]} km/h')

except Exception as e:
    print(f'  ❌ Error: {e}')
"
    echo ""
}

# ── Sun/Moon Info ────────────────────────────────────────────────────
cmd_sun() {
    local loc
    loc=$(urlencode "$LOCATION")
    
    echo ""
    echo "┌──────────────────────────────────────────────────────────────┐"
    echo "│  🌅 SUN & MOON: $LOCATION"
    echo "└──────────────────────────────────────────────────────────────┘"
    echo ""
    
    curl -s --max-time 10 "wttr.in/${loc}?format=%l:+🌅+%S+🌇+%s+|+Moon:+%m+Day+%M"
    echo ""
    echo ""
    
    curl -s --max-time 10 "wttr.in/${loc}?format=j1" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for day in data.get('weather', [])[:3]:
        astro = day.get('astronomy', [{}])[0]
        print(f'  📅 {day[\"date\"]}')
        print(f'     🌅 Sunrise:  {astro.get(\"sunrise\", \"N/A\")}')
        print(f'     🌇 Sunset:   {astro.get(\"sunset\", \"N/A\")}')
        print(f'     🌙 Moonrise: {astro.get(\"moonrise\", \"N/A\")}')
        print(f'     🌑 Moonset:  {astro.get(\"moonset\", \"N/A\")}')
        print(f'     🌓 Phase:    {astro.get(\"moon_phase\", \"N/A\")} ({astro.get(\"moon_illumination\", \"?\")}% illuminated)')
        print()
except Exception as e:
    print(f'  ❌ Error: {e}')
"
}

# ── Help ─────────────────────────────────────────────────────────────
cmd_help() {
    echo ""
    echo "🌤️  Weather Fetch Tool"
    echo "━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Usage: weather.sh <command> <location> [options]"
    echo ""
    echo "Commands:"
    echo "  current  <location>              Current weather conditions"
    echo "  forecast <location> [days:1-3]   Weather forecast"
    echo "  detailed <location>              Full detailed weather report"
    echo "  compare  <location1> <location2> Compare two locations"
    echo "  alerts   <location>              Check weather alerts"
    echo "  sun      <location>              Sunrise/sunset & moon info"
    echo ""
    echo "Location formats:"
    echo "  City name:    \"New York\", \"London\", \"Tokyo\""
    echo "  City+Country: \"Paris,France\""
    echo "  ZIP code:     \"10001\""
    echo "  Coordinates:  \"48.8566,2.3522\""
    echo "  Airport code: \"JFK\", \"LAX\""
    echo "  Landmark:     \"Eiffel Tower\""
    echo ""
    echo "Examples:"
    echo "  weather.sh current \"San Francisco\""
    echo "  weather.sh forecast Tokyo 3"
    echo "  weather.sh compare \"New York\" \"London\""
    echo "  weather.sh alerts Miami"
    echo ""
}

# ── Route Command ────────────────────────────────────────────────────
case "$COMMAND" in
    current)  cmd_current ;;
    forecast) cmd_forecast ;;
    detailed) cmd_detailed ;;
    compare)  cmd_compare ;;
    alerts)   cmd_alerts ;;
    sun)      cmd_sun ;;
    help|*)   cmd_help ;;
esac
