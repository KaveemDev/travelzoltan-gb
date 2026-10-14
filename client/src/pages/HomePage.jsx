import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import certificationImg from '../assets/certification.png';
import ServicesValueSection from '../components/ServicesValueSection';
import { trustAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.zoltanvisa.com/api';

// Smooth In-View Counter with cubic easing and live increment support
const StatCounter = ({ end, decimals = 0, prefix = '', suffix = '', isIncrementing = false, duration = 1800 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [inView, setInView] = useState(false);
  const hasAnimatedRef = useRef(false);
  const domRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (domRef.current) {
      observer.observe(domRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;

    if (!hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      let startTime = null;
      let frameId;

      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentVal = ease * end;
        setDisplayValue(currentVal);

        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        } else {
          setDisplayValue(end);
        }
      };

      frameId = requestAnimationFrame(step);
      return () => {
        if (frameId) cancelAnimationFrame(frameId);
      };
    } else {
      setDisplayValue(end);
    }
  }, [inView, end, duration]);

  const formatted = decimals > 0 
    ? Number(displayValue).toFixed(decimals) 
    : Math.round(displayValue);

  return (
    <span 
      ref={domRef} 
      className={`tabular-nums inline-block transition-all duration-300 transform ${
        isIncrementing ? 'scale-110 text-emerald-600' : 'scale-100'
      }`}
    >
      {prefix}{formatted}{suffix}
    </span>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [citizenship, setCitizenship] = useState('');
  const [destination, setDestination] = useState('');
  const [otherCitizenship, setOtherCitizenship] = useState('');
  const [otherDestination, setOtherDestination] = useState('');
  const [citizenshipOptions, setCitizenshipOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [allCitizenships, setAllCitizenships] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroDestIndex, setHeroDestIndex] = useState(0);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Dynamic happy clients live counter (increments every 5s)
  const [happyClientsCount, setHappyClientsCount] = useState(100);
  const [isClientIncrementing, setIsClientIncrementing] = useState(false);
  const [appointmentSlots, setAppointmentSlots] = useState([]);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const data = await trustAPI.getPublicAppointmentSlots();
        if (data && data.appointmentSlots && data.appointmentSlots.length > 0) {
          setAppointmentSlots(data.appointmentSlots);
        } else {
          setAppointmentSlots([
            { id: 1, destination: 'France (Schengen)', consular_city: 'London', center_name: 'TLScontact', earliest_date: '14 Oct 2026', slots_status: 'Express Available' },
            { id: 2, destination: 'Spain (Schengen)', consular_city: 'London', center_name: 'BLS International', earliest_date: '15 Oct 2026', slots_status: 'Slots Open' },
            { id: 3, destination: 'Italy (Schengen)', consular_city: 'London', center_name: 'VFS Global', earliest_date: '18 Oct 2026', slots_status: 'Filling Fast (3 left)' },
            { id: 4, destination: 'Switzerland', consular_city: 'London', center_name: 'TLScontact', earliest_date: '14 Oct 2026', slots_status: 'Available' },
            { id: 5, destination: 'United States', consular_city: 'London', center_name: 'US Embassy London', earliest_date: '24 Oct 2026', slots_status: 'Priority Slots Open' },
            { id: 6, destination: 'Germany (Schengen)', consular_city: 'London', center_name: 'VisaMetric London', earliest_date: '17 Oct 2026', slots_status: 'Standard Slot' }
          ]);
        }
      } catch (e) {
        console.warn('Could not load appointment slots on home:', e);
      }
    };
    fetchSlots();
  }, []);

  // Dynamic hero destinations list with fallback
  const heroDestinations = allDestinations.length > 0 
    ? Array.from(new Set(allDestinations)) 
    : ['Schengen Area'];

  const currentHeroDestination = heroDestinations[heroDestIndex % heroDestinations.length] || 'Schengen Area';
  const nextHeroDestination = heroDestinations[(heroDestIndex + 1) % heroDestinations.length] || 'Schengen Area';

  // Cycle through card deck: front card flies away, shadow card rises to front
  useEffect(() => {
    if (heroDestinations.length <= 1) return;

    const interval = setInterval(() => {
      setIsDiscarding(true);

      setTimeout(() => {
        setHeroDestIndex((prev) => (prev + 1) % heroDestinations.length);
        setIsDiscarding(false);
      }, 500);
    }, 3200);

    return () => clearInterval(interval);
  }, [heroDestinations.length, allDestinations]);

  // Live increment for Happy Clients every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHappyClientsCount((prev) => prev + 1);
      setIsClientIncrementing(true);
      const timer = setTimeout(() => {
        setIsClientIncrementing(false);
      }, 600);
      return () => clearTimeout(timer);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Fetch citizenship and destination options from API
  useEffect(() => {
    const fetchVisaOptions = async () => {
      try {
        console.log('[HomePage] Fetching from:', `${API_URL}/visa-options`);
        const response = await fetch(`${API_URL}/visa-options`);
        console.log('[HomePage] Response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[HomePage] Received data:', data);
          setCitizenshipOptions(data.citizenships || []);
          setDestinationOptions(data.destinations || []);
          setAllCitizenships(data.citizenships || []);
          setAllDestinations(data.destinations || []);
          setConfigurations(data.configurations || []);
        } else {
          const errorText = await response.text();
          console.error('[HomePage] Failed to fetch visa options:', errorText);
          
          // Fallback options
          const fallbackCitizenships = ['United Kingdom', 'Europe Nationals'];
          const fallbackDestinations = ['Europe (Schengen States)', 'USA', 'Canada', 'Australia', 'Dubai', 'New Zealand', 'India', 'Japan'];
          const fallbackConfigs = [
            { citizenship: 'United Kingdom', destination: 'Europe (Schengen States)' },
            { citizenship: 'United Kingdom', destination: 'USA' },
            { citizenship: 'United Kingdom', destination: 'Canada' },
            { citizenship: 'United Kingdom', destination: 'Australia' },
            { citizenship: 'United Kingdom', destination: 'Dubai' },
            { citizenship: 'United Kingdom', destination: 'New Zealand' },
            { citizenship: 'United Kingdom', destination: 'India' },
            { citizenship: 'United Kingdom', destination: 'Japan' },
            { citizenship: 'Europe Nationals', destination: 'Europe (Schengen States)' },
            { citizenship: 'Europe Nationals', destination: 'USA' },
            { citizenship: 'Europe Nationals', destination: 'Canada' },
            { citizenship: 'Europe Nationals', destination: 'Australia' }
          ];

          setCitizenshipOptions(fallbackCitizenships);
          setDestinationOptions(fallbackDestinations);
          setAllCitizenships(fallbackCitizenships);
          setAllDestinations(fallbackDestinations);
          setConfigurations(fallbackConfigs);
        }
      } catch (error) {
        console.error('[HomePage] Error fetching visa options:', error);
        
        // Fallback options
        const fallbackCitizenships = ['United Kingdom', 'Europe Nationals'];
        const fallbackDestinations = ['Europe (Schengen States)', 'USA', 'Canada', 'Australia', 'Dubai', 'New Zealand', 'India', 'Japan'];
        const fallbackConfigs = [
          { citizenship: 'United Kingdom', destination: 'Europe (Schengen States)' },
          { citizenship: 'United Kingdom', destination: 'USA' },
          { citizenship: 'United Kingdom', destination: 'Canada' },
          { citizenship: 'United Kingdom', destination: 'Australia' },
          { citizenship: 'United Kingdom', destination: 'Dubai' },
          { citizenship: 'United Kingdom', destination: 'New Zealand' },
          { citizenship: 'United Kingdom', destination: 'India' },
          { citizenship: 'United Kingdom', destination: 'Japan' },
          { citizenship: 'Europe Nationals', destination: 'Europe (Schengen States)' },
          { citizenship: 'Europe Nationals', destination: 'USA' },
          { citizenship: 'Europe Nationals', destination: 'Canada' },
          { citizenship: 'Europe Nationals', destination: 'Australia' }
        ];

        setCitizenshipOptions(fallbackCitizenships);
        setDestinationOptions(fallbackDestinations);
        setAllCitizenships(fallbackCitizenships);
        setAllDestinations(fallbackDestinations);
        setConfigurations(fallbackConfigs);
      } finally {
        setLoading(false);
      }
    };

    fetchVisaOptions();
  }, []);

  // Filter citizenship and destination options based on selections
  useEffect(() => {
    // 1. Filter destinations based on selected citizenship
    if (citizenship && citizenship !== 'Select Citizenship' && citizenship !== 'Other Nationals' && configurations && configurations.length > 0) {
      const validDestinations = configurations
        .filter(c => c.citizenship && c.citizenship.trim() === citizenship)
        .map(c => c.destination ? c.destination.trim() : '');
      
      const filteredDests = allDestinations.filter(d => validDestinations.includes(d));
      setDestinationOptions(filteredDests);
      
      if (destination && destination !== 'Other Countries' && !filteredDests.includes(destination)) {
        setDestination('');
      }
    } else {
      setDestinationOptions(allDestinations);
    }

    // 2. Filter citizenships based on selected destination
    if (destination && destination !== 'Select Destination' && destination !== 'Other Countries' && configurations && configurations.length > 0) {
      const validCitizenships = configurations
        .filter(c => c.destination && c.destination.trim() === destination)
        .map(c => c.citizenship ? c.citizenship.trim() : '');
      
      const filteredCitizens = allCitizenships.filter(c => validCitizenships.includes(c));
      setCitizenshipOptions(filteredCitizens);

      if (citizenship && citizenship !== 'Other Nationals' && !filteredCitizens.includes(citizenship)) {
        setCitizenship('');
      }
    } else {
      setCitizenshipOptions(allCitizenships);
    }
  }, [citizenship, destination, allCitizenships, allDestinations, configurations]);

  const handleCheckDetails = () => {
    if (!citizenship || citizenship === 'Select Citizenship') return;
    if (!destination || destination === 'Select Destination') return;

    const finalCitizenship = citizenship === 'Other Nationals' && otherCitizenship
      ? otherCitizenship
      : citizenship;
    const finalDestination = destination === 'Other Countries' && otherDestination
      ? otherDestination
      : destination;
    const params = new URLSearchParams({
      citizenship: finalCitizenship,
      destination: finalDestination
    });
    navigate(`/checklist?${params.toString()}`, {
      state: { citizenship: finalCitizenship, destination: finalDestination }
    });
  };

  return (
    <main className="pt-24">
      {/* Hero Section */}
      <section className="relative min-h-[870px] flex items-center overflow-hidden px-6 md:px-12">
        <div className="max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 z-10">
            <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary font-headline font-bold text-sm tracking-wide">
              YOUR TRUSTED DIGITAL VISA CONSULTANT
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-6 text-on-surface">
              Worldwide Visa Assistance. <span className="text-primary">Simplified.</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-10 leading-relaxed">
              Apply for visas worldwide with expert guidance, verified documentation, and real-time support. Experience seamless visa processing reimagined for modern travelers.
            </p>
            
            {/* Interactive Selector Box */}
            <div id="selector-box" className="bg-surface-container-lowest editorial-shadow rounded-lg p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center scroll-mt-32">
              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">
                  Citizenship
                </label>
                <div className="relative">
                  {citizenship === 'Other Nationals' ? (
                    <input
                      type="text"
                      value={otherCitizenship}
                      onChange={(e) => setOtherCitizenship(e.target.value)}
                      placeholder="Enter your nationality"
                      className="w-full bg-surface-container-low border-none rounded-DEFAULT py-4 px-5 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all"
                      autoFocus
                    />
                  ) : (
                    <div className="relative group">
                      <select
                        value={citizenship}
                        onChange={(e) => setCitizenship(e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-DEFAULT py-4 px-5 text-on-surface appearance-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
                        disabled={loading}
                      >
                        <option value="">{loading ? 'Loading...' : 'Select Citizenship'}</option>
                        {citizenshipOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                        <option>Other Nationals</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  )}
                  {citizenship === 'Other Nationals' && (
                    <button
                      onClick={() => {
                        setCitizenship('');
                        setOtherCitizenship('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-outline ml-1">
                  Destination
                </label>
                <div className="relative">
                  {destination === 'Other Countries' ? (
                    <input
                      type="text"
                      value={otherDestination}
                      onChange={(e) => setOtherDestination(e.target.value)}
                      placeholder="Enter destination country"
                      className="w-full bg-surface-container-low border-none rounded-DEFAULT py-4 px-5 text-on-surface focus:ring-2 focus:ring-primary/40 transition-all"
                      autoFocus
                    />
                  ) : (
                    <div className="relative group">
                      <select
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-DEFAULT py-4 px-5 text-on-surface appearance-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
                        disabled={loading}
                      >
                        <option value="">{loading ? 'Loading...' : 'Select Destination'}</option>
                        {destinationOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                        <option>Other Countries</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  )}
                  {destination === 'Other Countries' && (
                    <button
                      onClick={() => {
                        setDestination('');
                        setOtherDestination('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={handleCheckDetails}
                className="w-full md:w-auto bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold px-10 py-4 rounded-xl hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
              >
                Check Details
              </button>
            </div>
          </div>
          
          <div className="lg:col-span-5 relative hidden lg:block h-full min-h-[600px]">
            <div className="absolute top-0 right-0 w-4/5 h-[80%] rounded-[4rem] overflow-hidden rotate-3 z-0">
              <img 
                className="w-full h-full object-cover" 
                src="https://images.pexels.com/photos/7235892/pexels-photo-7235892.jpeg" 
                alt="Beach"
              />
            </div>
            <div className="absolute bottom-0 left-0 w-3/4 h-[70%] rounded-[3rem] overflow-hidden -rotate-6 z-10 border-[12px] border-surface shadow-2xl">
              <img 
                className="w-full h-full object-cover" 
                src="https://images.pexels.com/photos/28555348/pexels-photo-28555348.jpeg" 
                alt="European Facade"
              />
            </div>
            {/* Animated Visa Approved Card Stack with Bouncing Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[270px] select-none animate-bounce">
              {/* Background Card (Sitting in shadow, rises to the front on discard) */}
              {heroDestinations.length > 1 && (
                <div 
                  className={`absolute inset-0 bg-surface-container-lowest/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 flex items-center gap-4 ${
                    isDiscarding
                      ? 'animate-card-rise-from-shadow z-20'
                      : 'scale-90 translate-y-3.5 -rotate-3 opacity-40 shadow-md z-10'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 shrink-0">
                    <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>
                      check_circle
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-outline uppercase tracking-wider">Visa Approved</p>
                      {isDiscarding && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>}
                    </div>
                    <p className="font-headline font-bold text-base md:text-lg text-on-surface truncate mt-0.5">
                      {nextHeroDestination}
                    </p>
                  </div>
                </div>
              )}

              {/* Front Card (Active card, flies away to top-right on discard) */}
              <div 
                className={`relative bg-surface-container-lowest/95 backdrop-blur-md p-5 rounded-2xl editorial-shadow flex items-center gap-4 border border-white/90 shadow-2xl ${
                  isDiscarding
                    ? 'animate-card-fly-away z-30 pointer-events-none'
                    : 'scale-100 translate-y-0 rotate-0 opacity-100 z-20'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>
                    check_circle
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-outline uppercase tracking-wider">Visa Approved</p>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                  </div>
                  <p className="font-headline font-bold text-base md:text-lg text-on-surface truncate mt-0.5">
                    {currentHeroDestination}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badge Section */}
      <section className="py-12 px-6 md:px-12 bg-white border-y border-slate-100">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
            <div className="shrink-0">
              <h2 className="font-headline text-sm font-bold uppercase tracking-[0.2em] text-outline">
                Trusted & Certified
              </h2>
            </div>
            <div className="flex items-center gap-8">
              <img
                src={certificationImg}
                alt="Official Certification"
                className="h-16 w-auto object-contain rounded shadow-sm"
              />
            </div>
            <div className="flex justify-center md:justify-end overflow-hidden">
              <div className="flex items-center gap-8">
                <div className="text-center min-w-[90px]">
                  <p className="text-3xl font-bold text-primary">
                    <StatCounter end={99.8} decimals={1} suffix="%" duration={1600} />
                  </p>
                  <p className="text-xs text-outline">Success Rate</p>
                </div>
                <div className="text-center min-w-[100px]">
                  <p className="text-3xl font-bold text-primary">
                    <StatCounter 
                      end={happyClientsCount} 
                      suffix="k+" 
                      duration={1800} 
                      isIncrementing={isClientIncrementing} 
                    />
                  </p>
                  <p className="text-xs text-outline">Happy Clients</p>
                </div>
                <div className="text-center min-w-[80px]">
                  <p className="text-3xl font-bold text-primary">
                    <StatCounter end={20} suffix="+" duration={1400} />
                  </p>
                  <p className="text-xs text-outline">Countries</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Services & Value Proposition Section */}
      <ServicesValueSection />

      {/* Bento Grid - Destinations */}
      <section id="destinations" className="py-24 px-6 md:px-12 bg-surface">
        <div className="max-w-screen-2xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface mb-4">
              Upcoming Tours & Destinations
            </h2>
            <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
              Limited-availability curated experiences for the discerning traveler.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-auto lg:h-[700px]">
            <div className="md:col-span-8 group relative rounded-lg overflow-hidden editorial-shadow">
              <img 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                src="https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80" 
                alt="Swiss Alps"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-10 w-full">
                <span className="bg-secondary text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest mb-4 inline-block uppercase">
                  Bestseller
                </span>
                <h3 className="font-headline text-4xl md:text-5xl font-extrabold text-white mb-4">
                  European Alpine Odyssey
                </h3>
                <p className="text-white/80 text-lg mb-8 max-w-xl">
                  A 12-day journey through the heart of Switzerland, France, and Italy.
                </p>
                <button 
                  onClick={() => navigate('/contact-us')}
                  className="bg-white text-on-surface font-bold px-8 py-4 rounded-xl hover:bg-primary hover:text-white transition-all flex items-center gap-3 cursor-pointer"
                >
                  Contact Us <span className="material-symbols-outlined text-sm">mail</span>
                </button>
              </div>
            </div>
            <div className="md:col-span-4 flex flex-col gap-8">
              <div className="flex-1 group relative rounded-lg overflow-hidden editorial-shadow min-h-[300px]">
                <img 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  src="https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&q=80" 
                  alt="Australia"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8">
                  <h4 className="font-headline text-2xl font-bold text-white mb-2">
                    Australian Coastlines
                  </h4>
                  <button 
                    onClick={() => navigate('/contact-us')}
                    className="text-white font-bold text-sm flex items-center gap-2 group-hover:gap-4 transition-all cursor-pointer"
                  >
                    Enquire Now <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 group relative rounded-lg overflow-hidden editorial-shadow min-h-[300px]">
                <img 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80" 
                  alt="Japan"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8">
                  <h4 className="font-headline text-2xl font-bold text-white mb-2">
                    Japanese Heritage
                  </h4>
                  <button 
                    onClick={() => navigate('/contact-us')}
                    className="text-white font-bold text-sm flex items-center gap-2 group-hover:gap-4 transition-all cursor-pointer"
                  >
                    Enquire Now <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-12">
        <div className="max-w-screen-2xl mx-auto">
          <div className="bg-surface-container-highest rounded-lg overflow-hidden flex flex-col lg:flex-row">
            <div className="p-12 lg:p-20 lg:w-1/2">
              <h2 className="font-headline text-4xl font-extrabold tracking-tighter mb-8">Visit Our London Boutique Office</h2>
              <p className="text-on-surface-variant text-lg mb-12">Prefer a face-to-face consultation? Our experts are ready to welcome you at our headquarters in the heart of London.</p>
              <div className="space-y-8"> 
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-lg">Address</p>
                    <p className="text-on-surface-variant">1 St Katharine's Way, London, E1W 1UN</p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">call</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-lg">Direct Line</p>
                    <a href="tel:+442030261633" className="text-on-surface-variant hover:text-primary transition-colors font-medium">+44 20 3026 1633</a>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">mail</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-lg">Support</p>
                    <a href="mailto:gb@zoltanvisa.com" className="text-on-surface-variant hover:text-primary transition-colors font-medium">gb@zoltanvisa.com</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 min-h-[400px] relative">
              <img className="absolute inset-0 w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" data-alt="classic red London telephone booth on a cobblestone street with the Big Ben tower in the distance" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjhDdSU6iD4d7Dwy1w1d1kfG6K0TWhhRzr7LBgUZRIasVNgKUi66LCF09ujtNcgYUY_bBLXj7TCeN78pgSE0IocPCxvU3aj2uOIVm2R_8alBzsyp3QPGgissm6kAVvq9JLEz3EWRVDR4wyHFzFicIK1xzxw27t7lfYyZ4sYkx86BGmjCANcZGpcTfbuGR_wDnPi8GsxNXwW5a9fZw7AhUrWxd9ke7U8u_h3dOPPWsqBQsgeAmleO3E7_qTE5XmBcBEAnIACEOG7io"/>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
