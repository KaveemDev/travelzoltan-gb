import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { visaAPI, trustAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.zoltanvisa.com/api';

// Speedometer Gauge Component modeled after the appointment availability meter
// Speedometer Gauge Component modeled after the appointment availability meter
const AppointmentSpeedometer = ({ days = 12, maxDays = 90 }) => {
  const currentDays = Math.min(Math.max(Number(days) || 0, 0), maxDays);
  const cx = 160;
  const cy = 145;
  const rInner = 74;
  const rOuterMinor = 86;
  const rOuterMajor = 94;
  const rLabel = 112;
  const totalTicks = 90;
  const startAngle = 210;
  const sweepAngle = 240;

  // Generate radial tick marks
  const ticks = [];
  for (let val = 0; val <= totalTicks; val += 1) {
    const angle = startAngle - (val / totalTicks) * sweepAngle;
    const rad = (angle * Math.PI) / 180;
    const isMajor = val % 10 === 0;
    const rOuter = isMajor ? rOuterMajor : rOuterMinor;
    const isFilled = val <= currentDays;

    const x1 = cx + rInner * Math.cos(rad);
    const y1 = cy - rInner * Math.sin(rad);
    const x2 = cx + rOuter * Math.cos(rad);
    const y2 = cy - rOuter * Math.sin(rad);

    ticks.push({
      val,
      isMajor,
      isFilled,
      x1,
      y1,
      x2,
      y2,
      labelX: cx + rLabel * Math.cos(rad),
      labelY: cy - rLabel * Math.sin(rad)
    });
  }

  // Pointer needle pointing at currentDays extending through ticks
  const needleAngle = startAngle - (currentDays / totalTicks) * sweepAngle;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleInnerX = cx + 58 * Math.cos(needleRad);
  const needleInnerY = cy - 58 * Math.sin(needleRad);
  const needleOuterX = cx + (rOuterMajor + 2) * Math.cos(needleRad);
  const needleOuterY = cy - (rOuterMajor + 2) * Math.sin(needleRad);

  return (
    <div className="relative w-full max-w-[320px] mx-auto flex flex-col items-center select-none">
      <svg
        viewBox="0 0 320 220"
        className="w-full h-auto overflow-visible"
        aria-label={`${currentDays} days until nearest available appointment`}
      >
        <defs>
          <filter id="dialShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Radial ticks */}
        {ticks.map((t) => (
          <g key={t.val}>
            <line
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isFilled ? '#4f46e5' : '#e2e8f0'}
              strokeWidth={t.isFilled ? (t.isMajor ? 2.5 : 2) : (t.isMajor ? 1.5 : 1)}
              strokeLinecap="round"
            />
            {t.isMajor && (
              <text
                x={t.labelX}
                y={t.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#94a3b8"
                fontSize="10"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                {t.val}
              </text>
            )}
          </g>
        ))}

        {/* Center circular disc with clean soft shadow */}
        <circle
          cx={cx}
          cy={cy}
          r={62}
          fill="#ffffff"
          stroke="#f1f5f9"
          strokeWidth="1.5"
          filter="url(#dialShadow)"
        />

        {/* Needle pointer extending through ticks to the number */}
        <line
          x1={needleInnerX}
          y1={needleInnerY}
          x2={needleOuterX}
          y2={needleOuterY}
          stroke="#4f46e5"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Dial Center text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="22"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          {currentDays} Days
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="#64748b"
          fontSize="9"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          until nearest available
        </text>
        <text
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          fill="#64748b"
          fontSize="9"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          appointment
        </text>
      </svg>
    </div>
  );
};

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
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isAppointmentReserved, setIsAppointmentReserved] = useState(false);

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
      const data = await trustAPI.getPublicAppointmentSlots(destination, citizenship);
      if (data && data.appointmentSlots && data.appointmentSlots.length > 0) {
        setAppointmentSlots(data.appointmentSlots);
        setSelectedAppointmentDate(data.appointmentSlots[0]?.earliest_date || '');
        setSelectedLocation(data.appointmentSlots[0]?.consular_city || '');
      } else {
        // Controlled from backend: if no appointment added to configuration/destination, don't show appointment
        setAppointmentSlots([]);
      }
    } catch (e) {
      console.warn('[ChecklistPage] Could not load appointment slots:', e);
      setAppointmentSlots([]);
    }
  };

  // Synchronize appointment configuration from visaData when loaded
  useEffect(() => {
    const appCfg = visaData?.appointment_data;
    if (appCfg && (appCfg.enabled === true || appCfg.has_appointment === true)) {
      if (appCfg.earliest_date) {
        setSelectedAppointmentDate(appCfg.earliest_date);
      }
      if (appCfg.location || appCfg.centers?.[0]?.city) {
        setSelectedLocation(appCfg.location || appCfg.centers?.[0]?.city || '');
      }
    }
  }, [visaData]);

  // Determine if appointment is enabled from backend
  const appointmentConfig = (visaData?.appointment_data && (visaData.appointment_data.enabled === true || visaData.appointment_data.has_appointment === true))
    ? visaData.appointment_data
    : null;

  const hasAppointment = Boolean(
    appointmentConfig || (appointmentSlots && appointmentSlots.length > 0)
  );

  // Consolidated appointment centers list
  const availableCenters = useMemo(() => {
    if (appointmentConfig?.centers && appointmentConfig.centers.length > 0) {
      return appointmentConfig.centers;
    }
    if (appointmentSlots && appointmentSlots.length > 0) {
      return appointmentSlots.map((s) => ({
        city: s.consular_city || 'Main Center',
        center_name: s.center_name || 'Consular Processing Center',
        earliest_date: s.earliest_date,
        slots_status: s.slots_status,
        appointment_type: s.appointment_type,
        days_until: s.days_until
      }));
    }
    if (appointmentConfig?.earliest_date) {
      return [{
        city: appointmentConfig.location || 'Official Center',
        center_name: 'Consular Processing Office',
        earliest_date: appointmentConfig.earliest_date,
        slots_status: appointmentConfig.badge_text || 'Available',
        days_until: appointmentConfig.days_until
      }];
    }
    return [];
  }, [appointmentConfig, appointmentSlots]);

  const activeCenter = useMemo(() => {
    if (availableCenters.length === 0) return null;
    if (selectedLocation) {
      const found = availableCenters.find((c) => (c.city || '').toLowerCase() === selectedLocation.toLowerCase());
      if (found) return found;
    }
    return availableCenters[0];
  }, [availableCenters, selectedLocation]);

  const earliestDate = activeCenter?.earliest_date || appointmentConfig?.earliest_date || selectedAppointmentDate || 'Earliest available';
  const badgeText = activeCenter?.slots_status || appointmentConfig?.badge_text || (availableCenters.length > 0 ? `${availableCenters.length} slots available for ${earliestDate}!` : '');
  const daysUntil = Number(activeCenter?.days_until ?? appointmentConfig?.days_until ?? 12) || 12;

  const earlierCountries = useMemo(() => {
    if (appointmentConfig?.earlier_countries && appointmentConfig.earlier_countries.length > 0) {
      return appointmentConfig.earlier_countries;
    }
    if (appointmentSlots?.[0]?.earlier_countries && appointmentSlots[0].earlier_countries.length > 0) {
      return appointmentSlots[0].earlier_countries;
    }
    return ['Austria', 'Switzerland', 'Germany', 'Finland', 'France', 'Croatia', 'Iceland', 'Netherlands', 'Portugal', 'Sweden'];
  }, [appointmentConfig, appointmentSlots]);

  const handleApplyNewRoute = (e) => {
    e.preventDefault();
    if (tempCitizenship && tempDestination) {
      setCitizenship(tempCitizenship);
      setDestination(tempDestination);
      setIsEditingRoute(false);
    }
  };

  const finalChosenAppointmentDate = customAppointmentDate || selectedAppointmentDate || (hasAppointment ? earliestDate : '');

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

        {/* Available Appointment Card - Controlled from backend (only shown if configured) */}
        {hasAppointment && (
          <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-sm mb-6 transition-all overflow-hidden">
            {/* Top Bar with Urgency Pill */}
            <div className="px-6 pt-6 sm:px-8 sm:pt-8 flex items-center justify-between flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{badgeText || `Available slots for ${earliestDate}!`}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
                <span>Live Consular Quota</span>
              </div>
            </div>

            {/* Main Content: Responsive 2-column grid on desktop, natural stack on mobile */}
            <div className="p-6 sm:p-8 pt-4 sm:pt-5 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Details & Action */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
                <div>
                  <h3 className="font-headline text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    Visa Appointment as Early as{' '}
                    <span className="text-[#4f46e5] font-black">{earliestDate}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                    Official embassy & biometrics appointments currently open for {destination}.
                  </p>
                </div>

                {/* Appointment Location Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Appointment Location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4f46e5]">
                      <span className="material-symbols-outlined text-xl">location_on</span>
                    </div>
                    <select
                      value={selectedLocation || (availableCenters[0]?.city || '')}
                      onChange={(e) => {
                        const loc = e.target.value;
                        setSelectedLocation(loc);
                        const found = availableCenters.find((c) => (c.city || '').toLowerCase() === loc.toLowerCase());
                        if (found && found.earliest_date) {
                          setSelectedAppointmentDate(found.earliest_date);
                        }
                      }}
                      className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200 text-slate-900 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-all shadow-2xs"
                    >
                      {availableCenters.map((center, idx) => (
                        <option key={idx} value={center.city}>
                          {center.city} {center.center_name ? `(${center.center_name})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <span className="material-symbols-outlined text-lg">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* Reserve Appointment CTA Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAppointmentReserved(true);
                    if (!selectedAppointmentDate && earliestDate) {
                      setSelectedAppointmentDate(earliestDate);
                    }
                  }}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md ${
                    isAppointmentReserved
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 ring-2 ring-emerald-600/30'
                      : 'bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-[#4f46e5]/25 active:scale-[0.99]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {isAppointmentReserved ? 'check_circle' : 'event_available'}
                  </span>
                  <span>
                    {isAppointmentReserved
                      ? `Appointment Reserved for ${earliestDate}`
                      : 'Reserve Appointment Now'}
                  </span>
                </button>

                {/* Optional Custom Target Travel Date Accordion */}
                <div className="pt-1">
                  <details className="group inline-block text-left">
                    <summary className="text-[11px] font-bold text-[#4f46e5] hover:underline cursor-pointer list-none flex items-center gap-1">
                      <span>Need a different target travel date?</span>
                      <span className="material-symbols-outlined text-xs group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
                      <label className="text-xs text-slate-600 font-medium">Target Date:</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={customAppointmentDate}
                        onChange={(e) => setCustomAppointmentDate(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                      />
                    </div>
                  </details>
                </div>
              </div>

              {/* Right Column: Speedometer Dial Gauge Meter */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/70 rounded-3xl p-6 border border-slate-100/90 shadow-2xs">
                <AppointmentSpeedometer days={daysUntil} maxDays={90} />
              </div>
            </div>

            {/* Bottom Section: Earlier Appointments in other countries */}
            {/* {earlierCountries && earlierCountries.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/40 px-6 sm:px-8 py-5">
                <div className="space-y-3 text-center sm:text-left">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="material-symbols-outlined text-[#4f46e5] text-base">flight_takeoff</span>
                    Earlier appointments available for these countries from {selectedLocation || destination}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    {earlierCountries.map((country, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTempDestination(country);
                          setDestination(country);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200/80 transition-all cursor-pointer shadow-2xs hover:border-slate-300"
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )} */}
          </div>
        )}

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
