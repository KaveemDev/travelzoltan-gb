import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { visaAPI, trustAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.zoltanvisa.com/api';

const countryCodes = [
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+65', country: 'SG', flag: '🇸🇬' }
];

const ChecklistPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visaData, setVisaData] = useState(null);

  // Route parameters
  const [citizenship, setCitizenship] = useState(
    searchParams.get('citizenship') || location.state?.citizenship || 'United Kingdom'
  );
  const [destination, setDestination] = useState(
    searchParams.get('destination') || location.state?.destination || 'Europe (Schengen States)'
  );
  const initialCategory = searchParams.get('category') || location.state?.selectedCategory || 'employed';
  const initialVisaCategory = searchParams.get('visaType') || location.state?.selectedVisaCategory || 'tourist';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedVisaCategory, setSelectedVisaCategory] = useState(initialVisaCategory);

  // Appointment dates state
  const [appointmentSlots, setAppointmentSlots] = useState([]);
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState('');
  const [customAppointmentDate, setCustomAppointmentDate] = useState('');

  // Interactive document preparation checklist tracking
  const [checkedDocs, setCheckedDocs] = useState({});

  // Route switcher options from API
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [allCitizenships, setAllCitizenships] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);
  const [tempCitizenship, setTempCitizenship] = useState(citizenship);
  const [tempDestination, setTempDestination] = useState(destination);

  // Quick Consultation Drawer / State
  const [showQuickConsultModal, setShowQuickConsultModal] = useState(false);
  const [consultName, setConsultName] = useState('');
  const [consultPhone, setConsultPhone] = useState('');
  const [consultSubmitted, setConsultSubmitted] = useState(false);

  // Fetch available route options for the switcher
  useEffect(() => {
    const fetchRouteOptions = async () => {
      try {
        const response = await fetch(`${API_URL}/visa-options`);
        if (response.ok) {
          const data = await response.json();
          setAllCitizenships(data.citizenships || []);
          setAllDestinations(data.destinations || []);
        } else {
          setAllCitizenships(['United Kingdom', 'Europe Nationals', 'India', 'United States']);
          setAllDestinations(['Europe (Schengen States)', 'USA', 'Canada', 'Australia', 'Dubai', 'Japan', 'France', 'Spain', 'Italy']);
        }
      } catch {
        setAllCitizenships(['United Kingdom', 'Europe Nationals', 'India', 'United States']);
        setAllDestinations(['Europe (Schengen States)', 'USA', 'Canada', 'Australia', 'Dubai', 'Japan', 'France', 'Spain', 'Italy']);
      }
    };
    fetchRouteOptions();
  }, []);

  // Sync URL search params
  useEffect(() => {
    const currentParams = new URLSearchParams(location.search);
    let changed = false;

    if (currentParams.get('citizenship') !== citizenship) {
      currentParams.set('citizenship', citizenship);
      changed = true;
    }
    if (currentParams.get('destination') !== destination) {
      currentParams.set('destination', destination);
      changed = true;
    }
    if (selectedCategory && currentParams.get('category') !== selectedCategory) {
      currentParams.set('category', selectedCategory);
      changed = true;
    }
    if (selectedVisaCategory && currentParams.get('visaType') !== selectedVisaCategory) {
      currentParams.set('visaType', selectedVisaCategory);
      changed = true;
    }

    if (changed) {
      setSearchParams(currentParams, { replace: true });
    }
  }, [citizenship, destination, selectedCategory, selectedVisaCategory, location.search, setSearchParams]);

  // Fetch visa requirements & appointment slots on route change
  useEffect(() => {
    fetchVisaRequirements();
    fetchAppointmentSlots();
  }, [citizenship, destination]);

  const fetchVisaRequirements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await visaAPI.getVisaRequirements(citizenship, destination);
      setVisaData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch visa requirements');
      console.error('Error fetching visa requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentSlots = async () => {
    try {
      const data = await trustAPI.getPublicAppointmentSlots(destination);
      if (data && data.appointmentSlots && data.appointmentSlots.length > 0) {
        setAppointmentSlots(data.appointmentSlots);
        setSelectedAppointmentDate(data.appointmentSlots[0]?.earliest_date || '');
      } else {
        // Fallback default slots based on destination
        const defaultSlots = [
          { id: 1, consular_city: 'London', center_name: 'TLScontact / VFS London', earliest_date: '14 Oct 2026', appointment_type: 'Express Available', slots_status: 'Available' },
          { id: 2, consular_city: 'Manchester', center_name: 'VFS Global Manchester', earliest_date: '16 Oct 2026', appointment_type: 'Standard Slot', slots_status: 'Filling Fast (3 left)' }
        ];
        setAppointmentSlots(defaultSlots);
        setSelectedAppointmentDate(defaultSlots[0].earliest_date);
      }
    } catch (e) {
      console.warn('[ChecklistPage] Could not load appointment slots:', e);
      const defaultSlots = [
        { id: 1, consular_city: 'London', center_name: 'TLScontact / VFS London', earliest_date: '14 Oct 2026', appointment_type: 'Express Available', slots_status: 'Available' },
        { id: 2, consular_city: 'Manchester', center_name: 'VFS Global Manchester', earliest_date: '16 Oct 2026', appointment_type: 'Standard Slot', slots_status: 'Filling Fast (3 left)' }
      ];
      setAppointmentSlots(defaultSlots);
      setSelectedAppointmentDate(defaultSlots[0].earliest_date);
    }
  };

  const handleApplyNewRoute = (e) => {
    e.preventDefault();
    if (tempCitizenship && tempDestination) {
      setCitizenship(tempCitizenship);
      setDestination(tempDestination);
      setIsEditingRoute(false);
    }
  };

  const finalChosenAppointmentDate = customAppointmentDate || selectedAppointmentDate;

  const handleStartApplication = () => {
    const params = new URLSearchParams({
      citizenship,
      destination,
      category: selectedCategory,
      visaType: selectedVisaCategory,
      appointmentDate: finalChosenAppointmentDate
    });
    navigate(`/apply?${params.toString()}`, {
      state: {
        citizenship,
        destination,
        visaData,
        selectedCategory,
        selectedVisaCategory,
        preferredAppointmentDate: finalChosenAppointmentDate
      }
    });
  };

  const handleOpenWhatsApp = (customText) => {
    const defaultText = `Hi Zoltan Visa Team! I'm planning my visa application for ${citizenship} traveling to ${destination} (${selectedCategory}). Earliest appointment requested: ${finalChosenAppointmentDate || 'Earliest available'}. Please assist me.`;
    window.dispatchEvent(
      new CustomEvent('open-whatsapp-dialog', {
        detail: { presetText: customText || defaultText }
      })
    );
  };

  const toggleDocChecked = (docName) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };

  // Country flag helper
  const getCountryFlag = (country) => {
    if (!country) return '🌍';
    const c = country.toLowerCase();
    if (c.includes('united kingdom') || c.includes('uk')) return '🇬🇧';
    if (c.includes('india')) return '🇮🇳';
    if (c.includes('united states') || c.includes('usa')) return '🇺🇸';
    if (c.includes('australia')) return '🇦🇺';
    if (c.includes('canada')) return '🇨🇦';
    if (c.includes('schengen') || c.includes('europe')) return '🇪🇺';
    if (c.includes('france')) return '🇫🇷';
    if (c.includes('spain')) return '🇪🇸';
    if (c.includes('italy')) return '🇮🇹';
    if (c.includes('germany')) return '🇩🇪';
    if (c.includes('switzerland')) return '🇨🇭';
    if (c.includes('japan')) return '🇯🇵';
    if (c.includes('dubai') || c.includes('uae')) return '🇦🇪';
    return '🌍';
  };

  // Categories list
  const applicantCategories = [
    { key: 'employed', label: 'Employed', icon: 'work' },
    { key: 'self_employed', label: 'Self-Employed / Director', icon: 'domain' },
    { key: 'student', label: 'Student', icon: 'school' },
    { key: 'unemployed', label: 'Unemployed / Dependent', icon: 'person' },
    { key: 'retired', label: 'Retired', icon: 'elderly' }
  ];

  const visaCategories = [
    { key: 'tourist', label: 'Tourist / Holiday', icon: 'beach_access' },
    { key: 'business', label: 'Business / Conference', icon: 'business_center' },
    { key: 'family', label: 'Visiting Family / Friend', icon: 'group' }
  ];

  // Extract clean list of required documents for selected category
  const fallbackDocs = [
    { name: 'Passport Front and Back', description: 'Original passport valid for at least 6 months beyond travel dates with 2 blank pages.', icon: 'badge', required: true },
    { name: 'UK Legal Residency Status (BRP / Share Code)', description: 'Valid UK biometric residence permit, share code, or settled status proof.', icon: 'verified_user', required: true },
    { name: selectedCategory === 'student' ? 'Student Enrollment / University Letter' : selectedCategory === 'self_employed' ? 'Company Registration & Invoices' : 'Employment Letter & Recent Payslips', description: 'Proof of occupation and financial stability.', icon: 'work', required: true },
    { name: 'Recent 3-Month Bank Statements', description: 'Official bank statements showing sufficient funds for your trip.', icon: 'account_balance', required: true },
    { name: 'Flight Itinerary & Hotel Reservation', description: 'Round-trip flight booking and confirmed accommodation (Arranged by Zoltan Visa).', icon: 'flight', required: false, providedByZoltan: true },
    { name: 'Schengen / Travel Medical Insurance', description: 'Minimum €30,000 / $50,000 emergency medical cover (Arranged by Zoltan Visa).', icon: 'shield', required: false, providedByZoltan: true }
  ];

  let displayDocs = fallbackDocs;
  if (visaData?.required_documents) {
    const vDocs = visaData.required_documents[selectedVisaCategory] || visaData.required_documents['tourist'] || {};
    const cDocs = vDocs[selectedCategory] || vDocs['employed'] || {};
    const nowDocs = cDocs.now || [];
    const laterDocs = cDocs.later || [];
    const combined = [...nowDocs, ...laterDocs];
    if (combined.length > 0) {
      displayDocs = combined.map(d => ({
        name: d.name,
        description: d.description || 'Embassy compliant document requirement.',
        icon: d.icon || 'description',
        required: true,
        providedByZoltan: (d.name || '').toLowerCase().includes('hotel') || (d.name || '').toLowerCase().includes('flight') || (d.name || '').toLowerCase().includes('insurance')
      }));
    }
  }

  const checkedCount = displayDocs.filter(d => checkedDocs[d.name]).length;
  const progressPercent = displayDocs.length > 0 ? Math.round((checkedCount / displayDocs.length) * 100) : 0;

  return (
    <main className="pt-24 min-h-screen bg-slate-50/60 pb-16">
      {/* Route Switcher Modal */}
      {isEditingRoute && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-dialog-appear">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-bold text-lg text-slate-900">Change Visa Destination</h3>
              <button
                onClick={() => setIsEditingRoute(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleApplyNewRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Your Passport / Citizenship
                </label>
                <select
                  value={tempCitizenship}
                  onChange={(e) => setTempCitizenship(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {allCitizenships.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Destination Country
                </label>
                <select
                  value={tempDestination}
                  onChange={(e) => setTempDestination(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {allDestinations.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingRoute(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:opacity-95 cursor-pointer"
                >
                  Update Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Streamlined Clean Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm mb-6 mt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified Consulate Checklist
                </span>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                  2025/2026 Season
                </span>
              </div>

              <h1 className="font-headline text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Visa Requirements for{' '}
                <span className="text-primary">{destination}</span>
              </h1>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-slate-800">
                  <span>{getCountryFlag(citizenship)}</span>
                  <span>{citizenship} Passport</span>
                </span>
                <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
                <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-slate-800">
                  <span>{getCountryFlag(destination)}</span>
                  <span>{destination}</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setTempCitizenship(citizenship);
                setTempDestination(destination);
                setIsEditingRoute(true);
              }}
              className="self-start md:self-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:border-primary text-slate-700 hover:text-primary text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-white shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Change Destination
            </button>
          </div>
        </div>

        {/* Available Appointment Dates Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Live Consular Appointment Availability
                </span>
              </div>
              <h2 className="font-headline text-xl sm:text-2xl font-bold text-white">
                Earliest Appointment Dates for {destination}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                We monitor official consular portals (TLScontact, VFS Global, BLS, and Embassies) every 15 minutes to secure priority slots.
              </p>
            </div>

            {/* Quick Slots Badges & Preferred Date Selector */}
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
              <div>
                <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Earliest Available Center Slots:
                </p>
                <div className="flex flex-wrap gap-2">
                  {appointmentSlots.map((slot) => {
                    const isSelected = selectedAppointmentDate === slot.earliest_date;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setSelectedAppointmentDate(slot.earliest_date);
                          setCustomAppointmentDate('');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-white shadow-md ring-2 ring-primary/40'
                            : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">event</span>
                        <span>{slot.consular_city}: {slot.earliest_date}</span>
                        {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Date Window Picker */}
              <div className="sm:border-l sm:border-white/10 sm:pl-4">
                <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Or Target Travel Date:
                </p>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={customAppointmentDate}
                  onChange={(e) => setCustomAppointmentDate(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-xl border border-white/20 outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Simplified Filter Bar: Applicant Status & Travel Purpose */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs mb-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                1. Select Your Applicant Status:
              </p>
              <div className="flex flex-wrap gap-2">
                {applicantCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                      <span>{cat.label}</span>
                      {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                2. Travel Purpose:
              </p>
              <div className="flex flex-wrap gap-2">
                {visaCategories.map((vc) => {
                  const isSelected = selectedVisaCategory === vc.key;
                  return (
                    <button
                      key={vc.key}
                      onClick={() => setSelectedVisaCategory(vc.key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{vc.icon}</span>
                      <span>{vc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Clean, Simple Required Documents Checklist */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-headline font-bold text-lg sm:text-xl text-slate-900">
                  Required Documents Checklist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click items to mark what you have ready
                </p>
              </div>

              {/* Simple Progress Counter */}
              <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700">
                <span>{checkedCount} of {displayDocs.length} Ready</span>
                <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Document Checklist Items */}
            <div className="space-y-3">
              {displayDocs.map((doc, idx) => {
                const isChecked = !!checkedDocs[doc.name];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleDocChecked(doc.name)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/20 shadow-2xs'
                        : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">check</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <h4 className={`font-bold text-sm ${isChecked ? 'text-emerald-950 line-through opacity-80' : 'text-slate-900'}`}>
                          {doc.name}
                        </h4>
                        {doc.providedByZoltan ? (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                            Provided by Zoltan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-semibold">
                            Applicant Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reassurance Banner */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex items-center gap-3 text-xs text-slate-700">
              <span className="material-symbols-outlined text-primary text-xl shrink-0">verified</span>
              <span>
                <strong>Don't worry if any document is missing:</strong> Your dedicated Zoltan case officer audits every paper, assists with formatting, and fills official forms prior to filing.
              </span>
            </div>
          </div>

          {/* Right Column: Clean Action Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
            <div className="bg-white rounded-3xl p-6 border-2 border-primary/20 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-headline font-bold text-sm text-slate-900 uppercase tracking-wider">
                  Application Summary
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Concierge Service
                </span>
              </div>

              {/* Fast Facts */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[150px]">{destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedCategory.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Earliest Slot:</span>
                  <span className="font-bold text-emerald-700">{finalChosenAppointmentDate || 'Earliest Slot'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Case Officer:</span>
                  <span className="font-semibold text-primary">Assigned Today</span>
                </div>
              </div>

              {/* What's Included */}
              <div className="space-y-1.5 text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-2">What Zoltan Prepares For You:</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                  <span>Priority Appointment Booking Slot</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                  <span>Official Flight & Hotel Reservations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                  <span>Embassy Application Form & Cover Letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                  <span>Full Legal Dossier Pre-Audit</span>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                onClick={handleStartApplication}
                className="w-full bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold py-4 px-5 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span>Start Visa Application</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>

              {/* Instant WhatsApp Help */}
              <button
                onClick={() => handleOpenWhatsApp()}
                className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-headline font-bold text-xs border border-emerald-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                Ask Questions on WhatsApp
              </button>

              <div className="pt-2 border-t border-slate-100 text-center">
                <Link
                  to="/why-trust-zoltan-visas"
                  className="text-xs text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs text-primary">verified</span>
                  Why Trust Zoltan? View our UK Incorporation & Accreditations
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChecklistPage;
