import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { visaAPI, trustAPI } from '../services/api';
import { getApplyFlow } from '../constants/applyFlow';
import { getChecklistContent } from '../constants/checklistPage';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.zoltanvisa.com/api';

// Fades a section up the first time it scrolls into view (motion is off under prefers-reduced-motion)
const Reveal = ({ children, className = '', ...rest }) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (shown || !ref.current) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: 0.12 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);
  return <section ref={ref} className={`${className} ${shown ? 'apply-rise' : 'opacity-0'}`} {...rest}>{children}</section>;
};

const Eyebrow = ({ children }) => (
  <p className="text-xs font-bold tracking-[0.18em] uppercase text-primary">{children}</p>
);

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

  const [openMistake, setOpenMistake] = useState(0);

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

  // Statuses, purposes and page copy all come from the route's configuration (shared with /apply)
  const flow = getApplyFlow(visaData?.form_schema, visaData?.appointment_data);
  const content = getChecklistContent(visaData?.form_schema, { destination, citizenship });
  const activePurpose = flow.purposes.find(p => p.key === selectedVisaCategory) || flow.purposes[0];

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

  const primaryCta = 'group inline-flex items-center gap-3 bg-on-surface text-white font-bold pl-6 pr-2 py-2 rounded-full shadow-lg hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] transition duration-300 cursor-pointer';
  const ctaArrow = (
    <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center transition duration-300 group-hover:translate-x-0.5 group-hover:bg-primary">
      <span className="material-symbols-outlined text-lg">arrow_forward</span>
    </span>
  );

  if (loading && !visaData) {
    return (
      <main className="pt-24 min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="pt-24 min-h-screen pb-20">
      {/* Route Switcher Modal */}
      {isEditingRoute && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-dialog-appear">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-bold text-lg text-slate-900">Change Visa Destination</h3>
              <button
                onClick={() => setIsEditingRoute(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleApplyNewRoute} className="space-y-4">
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Your Passport / Citizenship</span>
                <select
                  value={tempCitizenship}
                  onChange={(e) => setTempCitizenship(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {allCitizenships.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Destination Country</span>
                <select
                  value={tempDestination}
                  onChange={(e) => setTempDestination(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {allDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsEditingRoute(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:opacity-95 cursor-pointer">
                  Update Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <p role="alert" className="mt-4 p-3 rounded-xl bg-error/10 text-error text-sm font-semibold text-center">
            We couldn’t load the latest requirements. Showing our standard checklist instead.
          </p>
        )}

        {/* ---------- Hero ---------- */}
        <section className="grid lg:grid-cols-12 gap-10 items-center pt-8 pb-16">
          <div className="lg:col-span-7 space-y-6">
            <nav aria-label="Breadcrumb" className="apply-rise text-xs text-on-surface-variant flex items-center gap-1.5">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <span aria-hidden="true">/</span>
              <span>Visa checklist</span>
              <span aria-hidden="true">/</span>
              <span className="text-on-surface font-semibold">{destination}</span>
            </nav>

            <div className="apply-rise space-y-4" style={{ '--i': 1 }}>
              <Eyebrow>{content.hero_eyebrow}</Eyebrow>
              <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-on-surface">
                {content.hero_title} <span className="text-primary">{content.hero_highlight}</span>
              </h1>
              <p className="text-on-surface-variant sm:text-lg max-w-xl">{content.hero_subtitle}</p>
            </div>

            <div className="apply-rise flex flex-wrap items-center gap-2 text-sm" style={{ '--i': 2 }}>
              <span className="flex items-center gap-1.5 bg-white/80 border border-outline-variant/30 px-3 py-1.5 rounded-full font-semibold">
                <span aria-hidden="true">{getCountryFlag(citizenship)}</span>{citizenship}
              </span>
              <span className="material-symbols-outlined text-base text-on-surface-variant" aria-hidden="true">arrow_forward</span>
              <span className="flex items-center gap-1.5 bg-white/80 border border-outline-variant/30 px-3 py-1.5 rounded-full font-semibold">
                <span aria-hidden="true">{getCountryFlag(destination)}</span>{destination}
              </span>
              <button
                onClick={() => {
                  setTempCitizenship(citizenship);
                  setTempDestination(destination);
                  setIsEditingRoute(true);
                }}
                className="ml-1 text-primary font-semibold underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors cursor-pointer"
              >
                Change
              </button>
            </div>

            <div className="apply-rise flex flex-wrap items-center gap-3" style={{ '--i': 3 }}>
              <button onClick={handleStartApplication} className={primaryCta}>
                Start your application{ctaArrow}
              </button>
              <button
                onClick={() => handleOpenWhatsApp()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-outline-variant/50 bg-white/70 backdrop-blur font-bold text-on-surface hover:border-primary hover:text-primary transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                Talk to a visa expert
              </button>
            </div>

            {content.hero_points.length > 0 && (
              <ul className="apply-rise flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-surface-variant" style={{ '--i': 4 }}>
                {content.hero_points.map(pt => (
                  <li key={pt} className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>{pt}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: live appointment card when configured, otherwise a visual */}
          <div className="lg:col-span-5 apply-rise" style={{ '--i': 2 }}>
            {hasAppointment ? (
              <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-xl p-6 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {badgeText || `Available slots for ${earliestDate}`}
                  </span>
                  <span className="text-xs text-on-surface-variant font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>Live consular quota
                  </span>
                </div>
                <div className="grid grid-cols-5 items-center gap-2">
                  <div className="col-span-3">
                    <p className="text-sm text-on-surface-variant">Appointments as early as</p>
                    <p className="font-headline text-2xl font-extrabold text-on-surface leading-tight">{earliestDate}</p>
                  </div>
                  <div className="col-span-2 -my-4">
                    <AppointmentSpeedometer days={daysUntil} maxDays={90} />
                  </div>
                </div>
                <label className="block">
                  <span className="block text-xs font-bold text-on-surface mb-1.5">Appointment location</span>
                  <select
                    value={selectedLocation || (availableCenters[0]?.city || '')}
                    onChange={(e) => {
                      const loc = e.target.value;
                      setSelectedLocation(loc);
                      const found = availableCenters.find((c) => (c.city || '').toLowerCase() === loc.toLowerCase());
                      if (found && found.earliest_date) setSelectedAppointmentDate(found.earliest_date);
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-outline-variant/40 text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  >
                    {availableCenters.map((center, idx) => (
                      <option key={idx} value={center.city}>
                        {center.city} {center.center_name ? `(${center.center_name})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsAppointmentReserved(true);
                    if (!selectedAppointmentDate && earliestDate) setSelectedAppointmentDate(earliestDate);
                  }}
                  className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition duration-300 cursor-pointer active:scale-[0.99] ${
                    isAppointmentReserved ? 'bg-emerald-600 text-white' : 'bg-primary text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl ${isAppointmentReserved ? 'apply-pop' : ''}`}>
                    {isAppointmentReserved ? 'check_circle' : 'event_available'}
                  </span>
                  {isAppointmentReserved ? `Appointment reserved for ${earliestDate}` : 'Reserve appointment now'}
                </button>
                <details className="group">
                  <summary className="text-xs font-bold text-primary hover:underline cursor-pointer list-none flex items-center gap-1">
                    Need a different target travel date?
                    <span className="material-symbols-outlined text-xs group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-outline-variant/30 flex items-center gap-3">
                    <label htmlFor="targetDate" className="text-xs text-on-surface-variant font-medium">Target date</label>
                    <input
                      id="targetDate"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={customAppointmentDate}
                      onChange={(e) => setCustomAppointmentDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-outline-variant/50 text-xs font-semibold bg-white"
                    />
                  </div>
                </details>
              </div>
            ) : (
              <div className="relative max-w-md mx-auto lg:max-w-none lg:pl-6">
                {/* soft glow + tilted backing card for depth */}
                <div aria-hidden="true" className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-primary/25 via-primary/5 to-transparent blur-2xl" />
                <div aria-hidden="true" className="absolute inset-0 lg:left-6 rounded-[2.25rem] bg-primary/10 rotate-3 translate-x-2 translate-y-2" />

                <figure className="group relative p-2 bg-white rounded-[2.25rem] shadow-2xl shadow-primary/10 ring-1 ring-black/5">
                  <div className="relative aspect-[4/5] max-h-[30rem] w-full rounded-[1.75rem] overflow-hidden bg-gradient-to-br from-primary/80 via-primary to-secondary">
                    {content.hero_image ? (
                      <img
                        src={content.hero_image}
                        alt={destination}
                        loading="eager"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-9xl apply-float drop-shadow-xl" aria-hidden="true">{getCountryFlag(destination)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                        <span className="material-symbols-outlined text-sm">location_on</span>Destination
                      </span>
                      <span className="mt-1 flex items-center gap-2 font-headline text-2xl font-extrabold leading-tight">
                        <span aria-hidden="true">{getCountryFlag(destination)}</span>{destination}
                      </span>
                    </figcaption>
                  </div>
                </figure>

                {content.show.hero_badges && (
                  <>
                    <div className="apply-float absolute top-6 -right-2 sm:-right-4 bg-white/95 backdrop-blur rounded-full shadow-lg pl-2 pr-4 py-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
                      <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-base">verified</span>
                      </span>
                      {content.hero_pill}
                    </div>
                    <div className="apply-float absolute -left-3 lg:left-0 bottom-24 bg-white/95 backdrop-blur rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3" style={{ animationDelay: '-3s' }}>
                      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">{content.hero_badge_icon}</span>
                      </span>
                      <span className="text-sm leading-tight">
                        <span className="block font-bold text-on-surface">{content.hero_badge_title.replace(/\{count\}/g, displayDocs.length)}</span>
                        <span className="text-on-surface-variant">{content.hero_badge_subtitle.replace(/\{count\}/g, displayDocs.length)}</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------- What are you travelling for? ---------- */}
        {content.show.purposes && flow.purposes.length > 0 && (
          <Reveal className="py-14" aria-labelledby="purpose-heading">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <Eyebrow>Trip type</Eyebrow>
              <h2 id="purpose-heading" className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">{content.purpose_heading}</h2>
              <p className="text-on-surface-variant">{content.purpose_subtitle}</p>
            </div>

            <div role="tablist" aria-label="Trip purpose" className={`grid gap-3 grid-cols-2 ${flow.purposes.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {flow.purposes.map(p => {
                const selected = p.key === activePurpose?.key;
                return (
                  <button
                    key={p.key}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setSelectedVisaCategory(p.key)}
                    className={`group text-left rounded-2xl p-4 sm:p-5 border transition duration-300 cursor-pointer hover:-translate-y-1 ${
                      selected ? 'bg-on-surface text-white border-on-surface shadow-xl' : 'bg-white/90 border-outline-variant/30 hover:shadow-lg'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${selected ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
                      <span className="material-symbols-outlined">{p.icon || 'flight_takeoff'}</span>
                    </span>
                    <span className="block font-headline font-bold">{p.label}</span>
                    {p.description && <span className={`block text-sm mt-0.5 ${selected ? 'text-white/70' : 'text-on-surface-variant'}`}>{p.description}</span>}
                  </button>
                );
              })}
            </div>

            {activePurpose && (
              <div key={activePurpose.key} role="tabpanel" className="apply-rise mt-5 bg-white/90 backdrop-blur rounded-3xl border border-outline-variant/30 shadow-sm p-6 sm:p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <span className="material-symbols-outlined text-base">{activePurpose.icon || 'flight_takeoff'}</span>
                    {activePurpose.label}
                  </span>
                  <h3 className="font-headline text-2xl font-extrabold text-on-surface leading-snug">
                    {activePurpose.description || activePurpose.label} in {destination}
                  </h3>
                  <p className="text-on-surface-variant text-sm">
                    Your checklist below is updated for a {activePurpose.label.toLowerCase()} trip — {displayDocs.length} documents in total.
                  </p>
                  <button onClick={handleStartApplication} className={primaryCta}>
                    Start a {activePurpose.label.toLowerCase()} application{ctaArrow}
                  </button>
                </div>
                {activePurpose.points?.some(Boolean) && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">Usually involves</p>
                    <ul className="space-y-2.5">
                      {activePurpose.points.filter(Boolean).map((pt, i) => (
                        <li key={pt} className="apply-rise flex items-start gap-2.5 text-sm text-on-surface" style={{ '--i': i + 1 }}>
                          <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">check_circle</span>{pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-primary/5 border border-primary/15 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="flex items-center gap-3 text-sm text-on-surface">
                <span className="material-symbols-outlined text-primary text-2xl">help</span>
                <span><strong>Not sure which visa applies to you?</strong> Our experts can confirm it in a few minutes.</span>
              </p>
              <button onClick={() => handleOpenWhatsApp()} className="shrink-0 px-4 py-2 rounded-full bg-primary text-white text-sm font-bold hover:-translate-y-0.5 transition cursor-pointer">
                Ask an expert
              </button>
            </div>
          </Reveal>
        )}

        {/* ---------- What you'll typically need ---------- */}
        {content.show.documents && (
          <Reveal className="py-14 grid lg:grid-cols-12 gap-10 items-start" aria-labelledby="docs-heading">
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
              <Eyebrow>Document checklist</Eyebrow>
              <h2 id="docs-heading" className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">{content.documents_heading}</h2>
              <p className="text-on-surface-variant">{content.documents_subtitle}</p>
              <div className="bg-white/90 rounded-2xl border border-outline-variant/30 p-4">
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span>{checkedCount} of {displayDocs.length} ready</span>
                  <span className={progressPercent === 100 ? 'text-emerald-600' : 'text-primary'}>{progressPercent}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <button onClick={handleStartApplication} className={primaryCta}>
                Start your application{ctaArrow}
              </button>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div role="tablist" aria-label="Applicant status" className="flex flex-wrap gap-2">
                {flow.statuses.map(st => {
                  const selected = st.key === selectedCategory;
                  return (
                    <button
                      key={st.key}
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setSelectedCategory(st.key)}
                      className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 border transition duration-300 cursor-pointer ${
                        selected ? 'bg-on-surface text-white border-on-surface shadow-md' : 'bg-white/90 border-outline-variant/30 text-on-surface hover:border-primary hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{st.icon || 'person'}</span>{st.label}
                    </button>
                  );
                })}
              </div>

              <div key={`${selectedVisaCategory}-${selectedCategory}`} className="grid sm:grid-cols-2 gap-3">
                {displayDocs.map((doc, idx) => {
                  const isChecked = !!checkedDocs[doc.name];
                  return (
                    <button
                      key={`${doc.name}-${idx}`}
                      type="button"
                      onClick={() => toggleDocChecked(doc.name)}
                      aria-pressed={isChecked}
                      style={{ '--i': idx }}
                      className={`apply-rise text-left p-4 rounded-2xl border transition duration-300 cursor-pointer flex items-start gap-3 hover:-translate-y-0.5 hover:shadow-md ${
                        isChecked ? 'bg-emerald-50/80 border-emerald-300' : 'bg-white/90 border-outline-variant/30'
                      }`}
                    >
                      <span className={`mt-0.5 w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-colors ${isChecked ? 'bg-emerald-600 text-white' : 'bg-primary/10 text-primary'}`}>
                        <span key={String(isChecked)} className="apply-pop material-symbols-outlined text-lg">{isChecked ? 'check' : doc.icon}</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block font-bold text-sm ${isChecked ? 'text-emerald-950 line-through decoration-emerald-400' : 'text-on-surface'}`}>{doc.name}</span>
                        <span className="block text-xs text-on-surface-variant mt-1 leading-relaxed">{doc.description}</span>
                        {doc.providedByZoltan && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Provided by Zoltan</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="p-4 rounded-2xl bg-primary/5 border border-primary/15 flex items-center gap-3 text-sm text-on-surface">
                <span className="material-symbols-outlined text-primary text-xl shrink-0">verified</span>
                <span><strong>Missing something?</strong> Your case officer reviews every document and helps with anything you’re unsure about.</span>
              </p>
            </div>
          </Reveal>
        )}

        {/* ---------- Common mistakes ---------- */}
        {content.show.mistakes && content.mistakes.length > 0 && (
          <Reveal className="py-14 grid lg:grid-cols-12 gap-10 items-start" aria-labelledby="mistakes-heading">
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
              <Eyebrow>Before you apply</Eyebrow>
              <h2 id="mistakes-heading" className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">{content.mistakes_heading}</h2>
              <p className="text-on-surface-variant">{content.mistakes_subtitle}</p>
              <button
                onClick={() => handleOpenWhatsApp(`Hi Zoltan Visa Team! I'd like my ${destination} visa application reviewed before I submit it.`)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-outline-variant/50 bg-white/80 font-bold text-on-surface hover:border-primary hover:text-primary transition cursor-pointer"
              >
                Have your application reviewed
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>

            <ol className="lg:col-span-8 space-y-3">
              {content.mistakes.map((m, i) => {
                const open = openMistake === i;
                return (
                  <li key={m.title} className={`rounded-2xl border transition duration-300 ${open ? 'bg-white shadow-lg border-primary/30' : 'bg-white/80 border-outline-variant/30 hover:border-primary/30'}`}>
                    <button
                      type="button"
                      onClick={() => setOpenMistake(open ? -1 : i)}
                      aria-expanded={open}
                      className="w-full flex items-center gap-4 p-5 text-left cursor-pointer"
                    >
                      <span className={`font-headline text-2xl font-extrabold tabular-nums transition-colors ${open ? 'text-primary' : 'text-outline-variant'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1 font-bold text-on-surface">{m.title}</span>
                      <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <div className="px-5 pb-5 pl-[4.25rem] space-y-3">
                          {m.description && <p className="text-sm text-on-surface-variant">{m.description}</p>}
                          {m.tip && (
                            <p className="flex items-start gap-2 text-sm font-semibold text-primary">
                              <span className="material-symbols-outlined text-lg">tips_and_updates</span>{m.tip}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Reveal>
        )}
      </div>
    </main>
  );
};

export default ChecklistPage;
