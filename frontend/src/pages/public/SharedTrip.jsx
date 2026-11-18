import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiMapPin, FiCalendar, FiDollarSign, FiArrowRight, FiCompass } from 'react-icons/fi';
import { sharedAPI } from '../../services/api';
import MapView from '../../components/common/MapView';
import LoadingScreen from '../../components/common/LoadingScreen';
import './SharedTrip.css';

export default function SharedTrip() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await sharedAPI.getTrip(token);
        setTrip(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Shared expedition dossier not found or link has expired.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return <LoadingScreen message="Decrypting public expedition telemetry & itinerary dossiers..." />;
  }

  if (error || !trip) {
    return (
      <div className="shared-trip-error-page page-container text-center p-12">
        <div className="card max-w-md mx-auto p-8">
          <FiCompass size={40} className="text-primary-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Expedition Not Found</h2>
          <p className="text-sm text-secondary mb-6">{error || 'This shared link is inactive or invalid.'}</p>
          <Link to="/" className="btn btn-primary btn-sm">
            Explore Wayfare OS
          </Link>
        </div>
      </div>
    );
  }

  const startDateFormatted = trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
  const endDateFormatted = trip.end_date ? new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
  const stops = trip.stops || [];

  return (
    <div className="shared-trip-page page-container">
      {/* Top Banner */}
      <div className="shared-trip-hero card p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="shared-badge mb-2">
              <span className="radar-pulse"></span>
              <span>SHARED EXPEDITION DOSSIER • READ-ONLY</span>
            </div>
            <h1 className="shared-trip-title">{trip.name}</h1>
            <p className="shared-trip-sub mt-1">
              Curated by <strong>{trip.creator_name || 'Wayfare Explorer'}</strong> • {trip.starting_location || 'Global Route'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/register" className="btn btn-primary btn-sm">
              Clone to My Account <FiArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Meta Strip */}
        <div className="shared-meta-strip mt-6 pt-4 border-t border-subtle flex flex-wrap gap-6">
          <div className="meta-chip">
            <FiCalendar className="text-primary-400" />
            <span>{startDateFormatted} – {endDateFormatted}</span>
          </div>
          {trip.budget > 0 && (
            <div className="meta-chip">
              <FiDollarSign className="text-success" />
              <span>Budget: ${Number(trip.budget).toLocaleString()}</span>
            </div>
          )}
          <div className="meta-chip">
            <FiMapPin className="text-accent-amber" />
            <span>{stops.length} Verified Stops</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {trip.description && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-bold text-white mb-2">Expedition Overview</h3>
          <p className="text-sm text-secondary leading-relaxed">{trip.description}</p>
        </div>
      )}

      {/* Interactive Map */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Route Telemetry & Waypoints</h3>
            <span className="text-xs text-muted">Geographical flight path and coordinates</span>
          </div>
          <span className="text-xs text-primary font-mono">{stops.length} Leg Matrix</span>
        </div>
        <MapView stops={stops} />
      </div>

      {/* Stops Sequence */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-white mb-4">Scheduled Itinerary Waypoints</h3>
        {stops.length === 0 ? (
          <p className="text-xs text-muted">No stops published yet for this expedition.</p>
        ) : (
          <div className="space-y-3">
            {stops.map((stop, idx) => (
              <div key={stop.id || idx} className="shared-stop-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="stop-index-pill">{idx + 1}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{stop.destination_name || stop.notes || `Waypoint ${idx + 1}`}</h4>
                    <span className="text-xs text-muted">
                      {stop.country && `${stop.country} • `}
                      {stop.arrival_date ? new Date(stop.arrival_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      {stop.departure_date ? ` – ${new Date(stop.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                    </span>
                  </div>
                </div>
                {stop.notes && stop.destination_name && (
                  <span className="text-xs text-secondary max-w-xs text-right truncate hidden sm:inline">
                    {stop.notes}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
