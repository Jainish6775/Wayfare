import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import famousCitiesData from '../../data/famousCities';
import { 
  FiSearch, 
  FiCompass, 
  FiMap, 
  FiCalendar, 
  FiUsers, 
  FiBookmark, 
  FiUser, 
  FiPlus, 
  FiLogOut, 
  FiCornerDownLeft, 
  FiX 
} from 'react-icons/fi';
import './CommandPalette.css';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Listen for Cmd+K / Ctrl+K and custom event
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Static navigation commands
  const navCommands = [
    { id: 'cmd-dashboard', title: 'Command Center (Dashboard)', category: 'Navigation', icon: <FiCompass />, action: () => navigate('/dashboard') },
    { id: 'cmd-new-trip', title: 'Plan New Expedition', category: 'Actions', icon: <FiPlus />, action: () => navigate('/trips/new') },
    { id: 'cmd-trips', title: 'Expedition Queue (My Trips)', category: 'Navigation', icon: <FiMap />, action: () => navigate('/my-trips') },
    { id: 'cmd-explore', title: 'Explore 40 World Destinations', category: 'Navigation', icon: <FiCompass />, action: () => navigate('/explore') },
    { id: 'cmd-calendar', title: 'Flight & Stay Matrix (Calendar)', category: 'Navigation', icon: <FiCalendar />, action: () => navigate('/calendar') },
    { id: 'cmd-community', title: 'Global Travel Intelligence Feed', category: 'Navigation', icon: <FiUsers />, action: () => navigate('/community') },
    { id: 'cmd-saved', title: 'Wishlist Vault', category: 'Navigation', icon: <FiBookmark />, action: () => navigate('/saved') },
    { id: 'cmd-profile', title: 'Traveler Dossier & Settings', category: 'Navigation', icon: <FiUser />, action: () => navigate('/profile') },
  ];

  if (user) {
    navCommands.push({
      id: 'cmd-logout',
      title: 'Sign Out / Lock Workspace',
      category: 'Session',
      icon: <FiLogOut />,
      action: () => {
        logout();
        navigate('/login');
      }
    });
  }

  // Destination commands
  const destinationCommands = famousCitiesData.map(city => ({
    id: `dest-${city.id}`,
    title: `${city.name}, ${city.country}`,
    subtitle: `${city.region} • ${city.recommended_days} Days Recommended`,
    category: 'Destinations',
    image: city.image_url,
    action: () => navigate(`/trips/new?destination=${encodeURIComponent(city.name)}&image=${encodeURIComponent(city.image_url)}`)
  }));

  const allItems = [...navCommands, ...destinationCommands];

  const filteredItems = query.trim() === ''
    ? allItems.slice(0, 10)
    : allItems.filter(item => {
        const q = query.toLowerCase();
        return item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q));
      }).slice(0, 15);

  const handleSelect = (item) => {
    setIsOpen(false);
    item.action();
  };

  const handleKeyDown = (e) => {
    if (filteredItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) handleSelect(selected);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop animate-fade-in" onClick={() => setIsOpen(false)}>
      <div className="palette-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
        
        {/* Search Input Bar */}
        <div className="palette-search-bar">
          <FiSearch className="palette-search-icon" size={18} />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a command, city, or destination... (e.g. Kyoto, New Trip, Calendar)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          {query ? (
            <button className="btn-icon" onClick={() => setQuery('')}>
              <FiX size={14} />
            </button>
          ) : (
            <kbd className="palette-kbd">ESC</kbd>
          )}
        </div>

        {/* Results List */}
        <div className="palette-results-list">
          {filteredItems.length === 0 ? (
            <div className="palette-empty-state">
              <p>No matching commands or destinations found for "{query}".</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                className={`palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="palette-item-left">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="palette-item-thumb" />
                  ) : (
                    <div className="palette-item-icon">{item.icon || <FiCompass />}</div>
                  )}
                  <div className="palette-item-info">
                    <span className="palette-item-title">{item.title}</span>
                    {item.subtitle && (
                      <span className="palette-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                </div>

                <div className="palette-item-right">
                  <span className="palette-item-category">{item.category}</span>
                  {idx === selectedIndex && (
                    <FiCornerDownLeft size={13} className="palette-enter-indicator" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="palette-footer">
          <div className="palette-hints">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <span className="palette-badge">WAYFARE COMMAND PALETTE</span>
        </div>

      </div>
    </div>
  );
}
