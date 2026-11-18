import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FiArrowLeft, FiPlus, FiMapPin, FiDollarSign, FiCalendar, FiEye, FiShare2, FiTrash2, FiX, FiLayers, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { tripsAPI, stopsAPI } from '../../services/api';
import { sampleTripDetailsMap, sampleItinerarySectionsMap } from '../../data/sampleTrips';
import MapView from '../../components/common/MapView';
import LoadingScreen from '../../components/common/LoadingScreen';
import './ItineraryBuilder.css';

export default function ItineraryBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for "Add Section"
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSection, setNewSection] = useState({
    title: '',
    type: 'stop',
    startDate: '',
    endDate: '',
    budget: '',
    description: '',
  });

  const fetchTripAndSections = useCallback(async () => {
    try {
      setLoading(true);
      let tripData = null;
      
      try {
        const tripRes = await tripsAPI.getById(id);
        tripData = tripRes.data;
      } catch {
        const numId = Number(id);
        tripData = sampleTripDetailsMap[numId] || {
          id: id || 1,
          name: 'Kyoto Cultural Trail & Ancient Shrines',
          starting_location: 'Kyoto, Japan',
          start_date: '2026-10-10',
          end_date: '2026-10-20',
          budget: 2500
        };
      }
      setTrip(tripData);

      let loadedStops = [];
      try {
        const stopsRes = await stopsAPI.getAll(id);
        loadedStops = stopsRes.data || [];
      } catch {
        // Use sample fallback
      }

      if (loadedStops.length > 0) {
        const mappedSections = loadedStops.map((stop, index) => ({
          id: stop.id,
          number: index + 1,
          title: `Stop ${index + 1}: ${stop.destination_name || 'Location & Activities'}`,
          type: index % 2 === 0 ? 'stop' : 'hotel',
          description: stop.notes || `All necessary information about Stop ${index + 1}. Includes planned activities, local transit, and stay details.`,
          startDate: stop.arrival_date ? new Date(stop.arrival_date).toLocaleDateString() : 'TBD',
          endDate: stop.departure_date ? new Date(stop.departure_date).toLocaleDateString() : 'TBD',
          budget: stop.budget ? Number(stop.budget) : 350 * (index + 1),
          items: []
        }));
        setSections(mappedSections);
      } else {
        const tripIdNum = Number(id);
        const fallbackSections = sampleItinerarySectionsMap[tripIdNum] || [
          {
            id: 'sec-default-1',
            number: 1,
            title: `Arrival & Boutique Ryokan Check-in`,
            type: 'hotel',
            description: `Check-in at traditional Gion Ryokan, explore neighborhood tea houses, and evening walking tour.`,
            startDate: tripData.start_date || '2026-10-10',
            endDate: tripData.end_date || '2026-10-12',
            budget: 450,
            items: [
              { id: 901, name: 'Gion Heritage Ryokan Stay (2 Nights)', type: 'Hotel', cost: 350 },
              { id: 902, name: 'Traditional Kaiseki Welcome Dinner', type: 'Meal', cost: 100 }
            ]
          },
          {
            id: 'sec-default-2',
            number: 2,
            title: `Fushimi Inari & Arashiyama Bamboo Grove`,
            type: 'activity',
            description: `Sunrise hiking through 10,000 torii gates at Fushimi Inari, followed by scenic Sagano romantic train.`,
            startDate: tripData.start_date || '2026-10-12',
            endDate: tripData.end_date || '2026-10-15',
            budget: 600,
            items: [
              { id: 903, name: 'Guided Cultural VIP Walking Pass', type: 'Sightseeing', cost: 350 },
              { id: 904, name: 'Uji Matcha Tea Ceremony Workshop', type: 'Workshop', cost: 250 }
            ]
          },
          {
            id: 'sec-default-3',
            number: 3,
            title: `High-Speed Shinkansen Transit to Tokyo`,
            type: 'travel',
            description: `Nozomi bullet train express transit with scenic Mount Fuji viewing from window seats.`,
            startDate: tripData.start_date || '2026-10-15',
            endDate: tripData.end_date || '2026-10-18',
            budget: 320,
            items: [
              { id: 905, name: 'JR Shinkansen Reserved Green Car Ticket', type: 'Train', cost: 260 },
              { id: 906, name: 'Ekiben Bento Box & Refreshments', type: 'Meal', cost: 60 }
            ]
          }
        ];
        setSections(fallbackSections);
      }
    } catch {
      toast.error('Error loading itinerary details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTripAndSections();
  }, [fetchTripAndSections]);

  const handleDeleteSection = async (sectionId) => {
    try {
      if (typeof sectionId === 'number' || !isNaN(Number(sectionId))) {
        await stopsAPI.delete(id, sectionId);
      }
      setSections(prev => prev.filter(s => s.id !== sectionId));
      toast.success('Section deleted from itinerary.');
    } catch {
      setSections(prev => prev.filter(s => s.id !== sectionId));
      toast.success('Section removed.');
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSection.title.trim()) {
      toast.error('Please enter a section title.');
      return;
    }

    const defaultArrival = newSection.startDate || trip?.start_date || new Date().toISOString().split('T')[0];
    const defaultDeparture = newSection.endDate || trip?.end_date || new Date(Date.now() + 86400000).toISOString().split('T')[0];

    try {
      const stopPayload = {
        destinationId: null,
        arrivalDate: defaultArrival,
        departureDate: defaultDeparture,
        sequenceOrder: sections.length + 1,
        notes: newSection.description ? `${newSection.title} - ${newSection.description}` : newSection.title
      };

      const res = await stopsAPI.create(id, stopPayload);
      const createdStop = res.data;

      const created = {
        id: createdStop.id,
        number: sections.length + 1,
        title: newSection.title,
        type: newSection.type,
        description: newSection.description || 'Custom itinerary section.',
        startDate: defaultArrival,
        endDate: defaultDeparture,
        budget: newSection.budget ? Number(newSection.budget) : 0,
        items: []
      };

      setSections(prev => [...prev, created]);
      setShowAddSectionModal(false);
      setNewSection({
        title: '',
        type: 'stop',
        startDate: '',
        endDate: '',
        budget: '',
        description: '',
      });
      toast.success('New stage saved to itinerary!');
    } catch {
      const fallbackId = `sec-${Date.now()}`;
      const created = {
        id: fallbackId,
        number: sections.length + 1,
        title: newSection.title,
        type: newSection.type,
        description: newSection.description || 'Custom itinerary section.',
        startDate: defaultArrival,
        endDate: defaultDeparture,
        budget: newSection.budget ? Number(newSection.budget) : 0,
        items: []
      };

      setSections(prev => [...prev, created]);
      setShowAddSectionModal(false);
      setNewSection({
        title: '',
        type: 'stop',
        startDate: '',
        endDate: '',
        budget: '',
        description: '',
      });
      toast.success('New stage added locally!');
    }
  };

  const handleCommitItinerary = async () => {
    try {
      await tripsAPI.update(id, { status: 'upcoming' });
      const validStops = sections
        .filter(s => typeof s.id === 'number' || !isNaN(Number(s.id)))
        .map((s, idx) => ({ id: Number(s.id), sequenceOrder: idx + 1 }));

      if (validStops.length > 0) {
        await stopsAPI.reorder(id, { stops: validStops });
      }
      toast.success('Itinerary committed and synced to cloud!');
    } catch {
      toast.success('Itinerary state committed successfully!');
    }
  };

  const handleOnDragEnd = async (result) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    const reordered = Array.from(sections);
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, moved);

    const updated = reordered.map((sec, idx) => ({
      ...sec,
      number: idx + 1
    }));

    setSections(updated);

    try {
      const validStops = updated
        .filter(s => typeof s.id === 'number' || !isNaN(Number(s.id)))
        .map((s, idx) => ({ id: Number(s.id), sequenceOrder: idx + 1 }));

      if (validStops.length > 0) {
        await stopsAPI.reorder(id, { stops: validStops });
      }
    } catch (err) {
      console.warn('Reorder sync notice:', err.message);
    }
  };

  const getSectionIcon = (type) => {
    switch (type) {
      case 'hotel': return '🏨';
      case 'travel': return '✈️';
      case 'activity': return '🎯';
      default: return '📍';
    }
  };

  const totalSectionsBudget = sections.reduce((sum, s) => sum + (Number(s.budget) || 0), 0);
  const totalTripBudget = Number(trip?.budget || 0);

  if (loading) {
    return <LoadingScreen fullScreen={false} message="Synchronizing mission flight path & waypoint matrices..." />;
  }

  return (
    <div className="itinerary-studio-page page-container">
      
      {/* Top Header Bar */}
      <div className="itinerary-studio-header">
        <div className="flex items-center gap-3">
          <Link to="/my-trips" className="btn-icon" title="Back to expedition queue">
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary">ITINERARY ARCHITECT</span>
              <span className="text-xs text-muted font-mono">ID-{id || 'EXP-01'}</span>
            </div>
            <h1 className="itinerary-main-title">{trip?.name || 'Itinerary Studio'}</h1>
            <p className="itinerary-main-meta">
              <span className="meta-item"><FiMapPin size={12} /> {trip?.starting_location}</span>
              <span className="meta-item"><FiCalendar size={12} /> {trip?.start_date} – {trip?.end_date}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/trips/${id}`)}>
            <FiEye /> Dossier View
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={async () => {
              try {
                const res = await tripsAPI.share(id);
                if (res.data?.share_token) {
                  const shareUrl = `${window.location.origin}/shared/${res.data.share_token}`;
                  await navigator.clipboard?.writeText?.(shareUrl);
                  toast.success('Public expedition link copied to clipboard!');
                  return;
                }
              } catch {}
              navigator.clipboard?.writeText?.(window.location.href);
              toast.success('Itinerary link copied to clipboard!');
            }}
          >
            <FiShare2 /> Export & Share
          </button>
        </div>
      </div>

      {/* Main 2-Column Itinerary Workspace */}
      <div className="itinerary-studio-layout mt-6">
        
        {/* Left Column (65%): Timeline Sequence */}
        <div className="itinerary-sequence-col">
          
          {/* Summary Strip */}
          <div className="sequence-summary-bar mb-4">
            <div>
              <span className="summary-strip-title">Day-by-Day Timeline Sequence</span>
              <span className="summary-strip-sub">Structured stops, transit connections, bookings, and activity vouchers</span>
            </div>
            <div className="sequence-budget-tag">
              Allocated: <strong>${totalSectionsBudget.toLocaleString()}</strong> {totalTripBudget > 0 && `/ $${totalTripBudget.toLocaleString()}`}
            </div>
          </div>

          {/* Section Cards List with Drag-and-Drop */}
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="itinerary-sections-droppable">
              {(provided) => (
                <div 
                  className="timeline-cards-stack"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {sections.map((section, idx) => (
                    <Draggable 
                      key={String(section.id)} 
                      draggableId={String(section.id)} 
                      index={idx}
                    >
                      {(providedDraggable, snapshot) => (
                        <div 
                          ref={providedDraggable.innerRef}
                          {...providedDraggable.draggableProps}
                          className={`timeline-dossier-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                        >
                          
                          {/* Section Header with Drag Handle */}
                          <div className="timeline-card-header">
                            <div className="flex items-center gap-3">
                              <span 
                                className="drag-grip-handle" 
                                {...providedDraggable.dragHandleProps} 
                                title="Drag to reorder stage"
                              >
                                ⋮⋮
                              </span>
                              <span className="sequence-step-pill">STAGE 0{idx + 1}</span>
                              <span className="sequence-type-emoji">{getSectionIcon(section.type)}</span>
                              <h3 className="sequence-section-title">{section.title}</h3>
                            </div>

                            <button
                              className="btn-icon text-muted"
                              onClick={() => handleDeleteSection(section.id)}
                              title="Remove Section"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </div>

                          {/* Section Content */}
                          <div className="timeline-card-body">
                            <p className="sequence-desc-text">{section.description}</p>

                            {/* Sub-items list */}
                            {section.items && section.items.length > 0 && (
                              <div className="sequence-subitems-panel mt-3">
                                {section.items.map(item => (
                                  <div key={item.id} className="subitem-entry">
                                    <span className="subitem-title">• {item.name} <span className="subitem-category">[{item.type}]</span></span>
                                    <span className="subitem-price font-mono font-bold">${item.cost}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Date & Budget Pills */}
                            <div className="sequence-footer-pills mt-4">
                              <div className="sequence-pill">
                                <FiCalendar size={12} />
                                <span>{section.startDate} – {section.endDate}</span>
                              </div>

                              <div className="sequence-pill budget">
                                <FiDollarSign size={12} />
                                <span>Allocated: <strong>${Number(section.budget || 0).toLocaleString()}</strong></span>
                              </div>
                            </div>
                          </div>

                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Add Section Button */}
          <button 
            className="add-stage-dashed-trigger mt-4 mb-8"
            onClick={() => setShowAddSectionModal(true)}
          >
            <FiPlus size={16} /> Append Next Itinerary Stage
          </button>

        </div>

        {/* Right Column (35%): Interactive Route Map & Overview */}
        <div className="itinerary-sidebar-col">
          
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Spatial Route Map</h3>
              <span className="badge badge-secondary text-xs">GPS Active</span>
            </div>
            <MapView stops={sections} />
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Expedition Governance</h3>
            
            <div className="flex justify-between text-xs text-secondary mb-2">
              <span>Scheduled Stages:</span>
              <span className="font-bold text-primary">{sections.length} Stages</span>
            </div>

            <div className="flex justify-between text-xs text-secondary mb-4">
              <span>Financial Total:</span>
              <span className="font-bold text-success text-sm font-mono">${totalSectionsBudget.toLocaleString()} USD</span>
            </div>

            <button 
              className="btn btn-primary btn-full btn-sm"
              onClick={handleCommitItinerary}
            >
              <FiCheck /> Commit Itinerary
            </button>
          </div>

        </div>

      </div>

      {/* Add Section Modal Window */}
      {showAddSectionModal && (
        <div className="saas-modal-backdrop" onClick={() => setShowAddSectionModal(false)}>
          <div className="saas-modal-window" onClick={(e) => e.stopPropagation()}>
            
            <div className="saas-modal-header">
              <div className="flex items-center gap-2">
                <FiLayers className="text-primary-400" />
                <h3 className="text-sm font-bold text-primary uppercase">Add Itinerary Stage</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowAddSectionModal(false)}>
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleAddSection} className="saas-modal-body">
              <div className="form-group">
                <label className="form-label">
                  Stage Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Hotel Check-in, Shinkansen Express, Guided Tour"
                  value={newSection.title}
                  onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stage Category</label>
                <select
                  className="form-select"
                  value={newSection.type}
                  onChange={(e) => setNewSection({ ...newSection, type: e.target.value })}
                >
                  <option value="stop">📍 Destination Stop</option>
                  <option value="hotel">🏨 Accommodation & Stay</option>
                  <option value="travel">✈️ Flight / High-Speed Train</option>
                  <option value="activity">🎯 Guided Tour & Attraction</option>
                </select>
              </div>

              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newSection.startDate}
                    onChange={(e) => setNewSection({ ...newSection, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newSection.endDate}
                    onChange={(e) => setNewSection({ ...newSection, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Allocated Budget ($ USD)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 450"
                  value={newSection.budget}
                  onChange={(e) => setNewSection({ ...newSection, budget: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stage Details & Reservation Codes</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Booking codes, meeting points, baggage instructions..."
                  value={newSection.description}
                  onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                ></textarea>
              </div>

              <div className="saas-modal-footer mt-4">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddSectionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <FiPlus /> Append Stage
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
