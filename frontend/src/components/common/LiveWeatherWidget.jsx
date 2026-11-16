import React, { useState, useEffect } from 'react';
import { fetchLiveWeather } from '../../services/liveData';
import { FiWind, FiDroplet, FiCompass, FiShield, FiSun } from 'react-icons/fi';
import './LiveWeatherWidget.css';

export default function LiveWeatherWidget({ latitude, longitude, destinationName }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState('C'); // 'C' or 'F'

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!latitude || !longitude) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await fetchLiveWeather(Number(latitude), Number(longitude));
      if (isMounted) {
        setWeather(data);
        setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [latitude, longitude]);

  if (!latitude || !longitude) return null;

  if (loading) {
    return (
      <div className="weather-widget-card loading">
        <div className="flex items-center gap-2 text-xs text-muted">
          <FiCompass className="animate-spin text-primary-400" />
          <span>Fetching satellite telemetry & climate radar...</span>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const toDisplayTemp = (cVal) => {
    if (unit === 'F') {
      return `${Math.round((cVal * 9) / 5 + 32)}°F`;
    }
    return `${cVal}°C`;
  };

  return (
    <div className="weather-widget-card">
      
      {/* Header */}
      <div className="weather-widget-header">
        <div className="flex items-center gap-2">
          <span className="weather-live-indicator">
            <span className="live-dot"></span>
            LIVE METEO RADAR
          </span>
          <span className="weather-location-tag">{destinationName || 'Coordinates'}</span>
        </div>
        <button 
          type="button"
          className="weather-unit-toggle"
          onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
          title="Toggle Celsius / Fahrenheit"
        >
          °{unit === 'C' ? 'F' : 'C'}
        </button>
      </div>

      {/* Main Condition Row */}
      <div className="weather-main-row">
        <div className="weather-temp-badge">
          <span className="weather-big-icon">{weather.weatherInfo.icon}</span>
          <div className="weather-temp-wrap">
            <span className="weather-current-temp">{toDisplayTemp(weather.currentTemp)}</span>
            <span className="weather-condition-label">{weather.weatherInfo.label}</span>
          </div>
        </div>

        <div className="weather-telemetry-chips">
          <div className="telemetry-chip">
            <FiDroplet size={12} className="text-blue-400" />
            <span>{weather.humidity}% Humidity</span>
          </div>
          <div className="telemetry-chip">
            <FiWind size={12} className="text-teal-400" />
            <span>{weather.windSpeed} km/h Wind</span>
          </div>
          <div className="telemetry-chip">
            <FiSun size={12} className="text-amber-400" />
            <span>Feels {toDisplayTemp(weather.feelsLike)}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Advisory / Packing Tip */}
      {weather.weatherInfo.tip && (
        <div className="weather-advisory-box">
          <FiShield size={13} className="text-primary-400 flex-shrink-0" />
          <span className="text-xs text-secondary">{weather.weatherInfo.tip}</span>
        </div>
      )}

      {/* 5-Day Forecast Strip */}
      {weather.daily && weather.daily.length > 0 && (
        <div className="weather-forecast-strip">
          {weather.daily.map((day, i) => (
            <div key={day.date || i} className={`forecast-day-pill ${i === 0 ? 'today' : ''}`}>
              <span className="forecast-day-name">{i === 0 ? 'Today' : day.dayName}</span>
              <span className="forecast-icon">{day.icon}</span>
              <div className="forecast-temps">
                <span className="max-temp">{toDisplayTemp(day.maxTemp)}</span>
                <span className="min-temp">{toDisplayTemp(day.minTemp)}</span>
              </div>
              {day.precipProb > 20 && (
                <span className="precip-pill">💧 {day.precipProb}%</span>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
