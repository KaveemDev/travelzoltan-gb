import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { visaAPI } from '../services/api';
import { getPayNowPoints, resolvePointText, getWhatsIncludedPoints } from '../utils/paymentUtils';

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
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+966', country: 'SA', flag: '🇸🇦' },
  { code: '+974', country: 'QA', flag: '🇶🇦' }
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
  const [activeTab, setActiveTab] = useState('now');

  // Interactive preparation checklist tracking
  const [checkedDocs, setCheckedDocs] = useState({});

  // Route switcher options from API
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [allCitizenships, setAllCitizenships] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [tempCitizenship, setTempCitizenship] = useState(citizenship);
  const [tempDestination, setTempDestination] = useState(destination);

  // Query Form 2-Step State
  const [queryStep, setQueryStep] = useState(1);
  const [queryPersonalInfo, setQueryPersonalInfo] = useState({
    name: '',
    surname: '',
    email: '',
    phoneCountryCode: '+44',
    phoneLocal: '',
    preferredContact: 'WhatsApp'
  });
  const [queryDetails, setQueryDetails] = useState({
    queryType: 'Group Member Application',
    message: '',
    dynamicAnswers: {}
  });
  const [queryFormError, setQueryFormError] = useState('');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [submittedQueryData, setSubmittedQueryData] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Fetch available route options for the quick switcher
  useEffect(() => {
    const fetchRouteOptions = async () => {
      try {
        const response = await fetch(`${API_URL}/visa-options`);
        if (response.ok) {
          const data = await response.json();
          setAllCitizenships(data.citizenships || []);
          setAllDestinations(data.destinations || []);
          setConfigurations(data.configurations || []);
        } else {
          // Fallbacks
          setAllCitizenships(['United Kingdom', 'Europe Nationals', 'India', 'United States']);
          setAllDestinations(['Europe (Schengen States)', 'USA', 'Canada', 'Australia', 'Dubai', 'Japan']);
        }
      } catch {
        setAllCitizenships(['United Kingdom', 'Europe Nationals', 'India', 'United States']);
        setAllDestinations(['Europe (Schengen States)', 'USA', 'Canada', 'Australia', 'Dubai', 'Japan']);
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

  // Fetch visa requirements on route change
  useEffect(() => {
    fetchVisaRequirements();
  }, [citizenship, destination]);

  // Reset active tab to 'now' when categories change
  useEffect(() => {
    setActiveTab('now');
  }, [selectedCategory, selectedVisaCategory]);

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

  const handleApplyNewRoute = (e) => {
    e.preventDefault();
    if (tempCitizenship && tempDestination) {
      setCitizenship(tempCitizenship);
      setDestination(tempDestination);
      setIsEditingRoute(false);
    }
  };

  const handleStartApplication = () => {
    const params = new URLSearchParams({
      citizenship,
      destination,
      category: selectedCategory,
      visaType: selectedVisaCategory
    });
    navigate(`/apply?${params.toString()}`, {
      state: {
        citizenship,
        destination,
        visaData,
        selectedCategory,
        selectedVisaCategory
      }
    });
  };

  const handleOpenWhatsApp = (text) => {
    const defaultText = `Hi Zoltan Team! I am reviewing the visa requirements for ${citizenship} traveling to ${destination} (${selectedCategory}, ${selectedVisaCategory}). Could you please guide me?`;
    window.dispatchEvent(
      new CustomEvent('open-whatsapp-dialog', {
        detail: {
          presetText: text || defaultText
        }
      })
    );
  };

  // Toggle document preparation checkbox
  const toggleDocChecked = (docName) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };

  // Extract required documents
  const fallbackDocsNow = [
    { name: 'Passport Front and Back', description: 'Valid for at least 6 months beyond intended stay with at least 2 blank pages.', icon: 'badge' },
    { name: 'UK Valid Status (Online Status / BRP)', description: 'Proof of current legal status, share code or biometric residence permit.', icon: 'verified_user' }
  ];

  let docsRequiredNow = fallbackDocsNow;
  let docsRequiredLater = [];
  let queryFormDocs = [];

  if (visaData?.required_documents) {
    const visaCatDocs = visaData.required_documents[selectedVisaCategory] || {};
    const applicantCatDocs = visaCatDocs[selectedCategory] || {};

    const hasAnyConfigured = Object.keys(visaData.required_documents).length > 0;

    if (applicantCatDocs.now && applicantCatDocs.now.length > 0) {
      docsRequiredNow = applicantCatDocs.now;
    } else if (hasAnyConfigured) {
      docsRequiredNow = applicantCatDocs.now || [];
    }

    if (applicantCatDocs.later && applicantCatDocs.later.length > 0) {
      docsRequiredLater = applicantCatDocs.later;
    }
    if (applicantCatDocs.query && applicantCatDocs.query.length > 0) {
      queryFormDocs = applicantCatDocs.query;
    }
  }

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
    if (c.includes('new zealand')) return '🇳🇿';
    if (c.includes('pakistan')) return '🇵🇰';
    if (c.includes('sri lanka')) return '🇱🇰';
    if (c.includes('bangladesh')) return '🇧🇩';
    if (c.includes('japan')) return '🇯🇵';
    if (c.includes('dubai') || c.includes('uae')) return '🇦🇪';
    return '🌍';
  };

  // Helper for document icons and badge styling
  const getDocIconInfo = (docName) => {
    const name = (docName || '').toLowerCase();
    if (name.includes('passport')) return { icon: 'travel', bg: 'bg-blue-50 text-blue-600 border-blue-200' };
    if (name.includes('status') || name.includes('brp') || name.includes('residence')) return { icon: 'badge', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    if (name.includes('bank') || name.includes('statement') || name.includes('financial')) return { icon: 'account_balance', bg: 'bg-amber-50 text-amber-600 border-amber-200' };
    if (name.includes('employment') || name.includes('employee') || name.includes('contract')) return { icon: 'work', bg: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
    if (name.includes('business') || name.includes('registration')) return { icon: 'storefront', bg: 'bg-purple-50 text-purple-600 border-purple-200' };
    if (name.includes('student') || name.includes('cas') || name.includes('school')) return { icon: 'school', bg: 'bg-teal-50 text-teal-600 border-teal-200' };
    if (name.includes('photo')) return { icon: 'photo_camera', bg: 'bg-rose-50 text-rose-600 border-rose-200' };
    if (name.includes('invitation') || name.includes('letter')) return { icon: 'mail', bg: 'bg-cyan-50 text-cyan-600 border-cyan-200' };
    return { icon: 'description', bg: 'bg-slate-50 text-slate-600 border-slate-200' };
  };

  // Pricing calculations
  const serviceFee = visaData?.service_fee;
  const totalAmount = typeof serviceFee?.total_amount === 'number'
    ? serviceFee.total_amount
    : parseFloat(serviceFee?.total_amount) || parseFloat(serviceFee?.total) || (serviceFee?.service_fee ? serviceFee.service_fee + (serviceFee?.admin_fee || 0) + (serviceFee?.express_fee || 0) : 150);
  const payNowAmount = typeof serviceFee?.pay_now_amount === 'number'
    ? serviceFee.pay_now_amount
    : parseFloat(serviceFee?.pay_now_amount) || Math.round(totalAmount * 0.5) || 70;
  const remainingBalance = Math.max(0, totalAmount - payNowAmount);

  // Customer Trust FAQs for conversion assurance
  const faqs = [
    {
      q: 'How does the visa application and file verification process work?',
      a: 'Once you begin your application, our senior visa case officers conduct a rigorous audit of your paperwork against current consulate requirements. We assemble your official embassy dossier, generate compliant flight and hotel vouchers, and secure your consular appointment slot.'
    },
    {
      q: 'What if I do not have all my documents ready today?',
      a: 'You can begin your application immediately! You only need basic traveler information to start. Your dedicated case officer will guide you step-by-step on how to collect, scan, and format any remaining papers.'
    },
    {
      q: 'Are confirmed flights, hotel bookings, and travel insurance included?',
      a: 'Yes! Zoltan provides 100% consulate-compliant round-trip flight reservations, verified hotel vouchers, and comprehensive travel medical insurance documents as part of our full service at no additional charge.'
    },
    {
      q: 'Is my personal data and documentation kept confidential and secure?',
      a: 'Yes. All personal information and document uploads are safeguarded using bank-grade 256-bit SSL encryption adhering strictly to GDPR data privacy standards. Your paperwork is strictly accessed only by your assigned legal case officer for consulate submission.'
    },
    {
      q: 'What is your approval and pre-check guarantee?',
      a: 'Our legal specialists pre-vet every detail of your dossier against official consulate criteria before submission. If our review identifies any missing requirements or flags, our specialists will advise you on the exact steps to ensure full compliance.'
    }
  ];

  // Dynamic "What's Included in Your Service" points configured by admin / defaults
  const whatsIncludedPoints = getWhatsIncludedPoints(visaData?.service_fee || visaData)
    .map(p => resolvePointText(p, payNowAmount, '£'));

  // Active documents for calculation
  const currentDocsList = activeTab === 'now' ? docsRequiredNow : activeTab === 'later' ? docsRequiredLater : [];
  const checkedCount = currentDocsList.filter(doc => checkedDocs[doc.name]).length;
  const progressPercent = currentDocsList.length > 0 ? Math.round((checkedCount / currentDocsList.length) * 100) : 0;

  // Categories helper
  const allCategories = [
    { key: 'employed', label: 'Employed', icon: 'work', desc: 'Salaried professional' },
    { key: 'self_employed', label: 'Self-Employed', icon: 'storefront', desc: 'Business owner / Director' },
    { key: 'student', label: 'Student', icon: 'school', desc: 'University / College' },
    { key: 'unemployed', label: 'Unemployed', icon: 'person_off', desc: 'Homemaker / Sponsored' },
    { key: 'other', label: 'Other / Query', icon: 'help_outline', desc: 'Special cases & custom queries' }
  ];

  const allVisaCategories = [
    { key: 'tourist', label: 'Tourist Visa', icon: 'flight_takeoff', desc: 'Leisure, holiday & sightseeing' },
    { key: 'visiting', label: 'Visit (Family/Friend)', icon: 'family_restroom', desc: 'Staying with relatives or friends' },
    { key: 'business', label: 'Business Visa', icon: 'business_center', desc: 'Meetings, conferences & trade' }
  ];

  const getDocsCountForVisaCategory = (vkKey) => {
    if (!visaData?.required_documents) return -1;
    const vkDocs = visaData.required_documents[vkKey];
    if (!vkDocs || typeof vkDocs !== 'object') return 0;

    let total = 0;
    Object.values(vkDocs).forEach(acDocs => {
      if (acDocs && typeof acDocs === 'object') {
        total += (Array.isArray(acDocs.now) ? acDocs.now.length : 0);
        total += (Array.isArray(acDocs.later) ? acDocs.later.length : 0);
        total += (Array.isArray(acDocs.query) ? acDocs.query.length : 0);
      }
    });
    return total;
  };

  const getDocsCountForApplicantCategory = (acKey, vkKey) => {
    if (!visaData?.required_documents) return -1;
    const acDocs = visaData.required_documents[vkKey]?.[acKey];
    if (!acDocs || typeof acDocs !== 'object') return 0;

    let total = 0;
    total += (Array.isArray(acDocs.now) ? acDocs.now.length : 0);
    total += (Array.isArray(acDocs.later) ? acDocs.later.length : 0);
    total += (Array.isArray(acDocs.query) ? acDocs.query.length : 0);
    return total;
  };

  const availableVisaCategories = allVisaCategories.filter(vc => {
    const count = getDocsCountForVisaCategory(vc.key);
    return count === -1 || count > 0;
  });
  const activeVisaCategoriesList = availableVisaCategories.length > 0 ? availableVisaCategories : allVisaCategories;

  useEffect(() => {
    if (activeVisaCategoriesList.length > 0 && !activeVisaCategoriesList.some(vc => vc.key === selectedVisaCategory)) {
      setSelectedVisaCategory(activeVisaCategoriesList[0].key);
    }
  }, [activeVisaCategoriesList, selectedVisaCategory]);

  const availableCategories = allCategories.filter(cat => {
    if (cat.key === 'other') return true;
    const count = getDocsCountForApplicantCategory(cat.key, selectedVisaCategory);
    return count === -1 || count > 0;
  });
  const activeCategoriesList = availableCategories.length > 0 ? availableCategories : allCategories;

  useEffect(() => {
    if (activeCategoriesList.length > 0 && !activeCategoriesList.some(cat => cat.key === selectedCategory)) {
      setSelectedCategory(activeCategoriesList[0].key);
    }
  }, [activeCategoriesList, selectedCategory, selectedVisaCategory]);

  // Query validation & submission
  const handleProceedToQueryDetails = (e) => {
    e.preventDefault();
    setQueryFormError('');

    if (!queryPersonalInfo.name.trim()) {
      setQueryFormError('Please enter your first name.');
      return;
    }
    if (!queryPersonalInfo.email.trim() && !queryPersonalInfo.phoneLocal.trim()) {
      setQueryFormError('Please provide at least your Email address or Phone number.');
      return;
    }
    if (queryPersonalInfo.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(queryPersonalInfo.email.trim())) {
      setQueryFormError('Please enter a valid email address.');
      return;
    }
    setQueryStep(2);
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    setQueryFormError('');
    setIsSubmittingQuery(true);

    try {
      const fullPhone = queryPersonalInfo.phoneLocal.trim()
        ? `${queryPersonalInfo.phoneCountryCode} ${queryPersonalInfo.phoneLocal.trim()}`
        : '';
      const isSpecialCategory = selectedCategory === 'other';
      const qType = isSpecialCategory ? queryDetails.queryType : `Query Form (${selectedCategory})`;

      const payload = {
        configuration_id: visaData?.configuration_id,
        citizenship,
        destination,
        name: queryPersonalInfo.name.trim(),
        surname: queryPersonalInfo.surname.trim(),
        fullName: `${queryPersonalInfo.name.trim()} ${queryPersonalInfo.surname.trim()}`.trim(),
        email: queryPersonalInfo.email.trim(),
        phone: fullPhone,
        phoneLocal: queryPersonalInfo.phoneLocal.trim(),
        phoneCountryCode: queryPersonalInfo.phoneCountryCode,
        preferredContact: queryPersonalInfo.preferredContact,
        applicantCategory: selectedCategory,
        applicantStatus: selectedCategory,
        visaCategory: selectedVisaCategory,
        queryType: qType,
        message: queryDetails.message.trim(),
        queryAnswers: queryDetails.dynamicAnswers,
        source: 'Query Form'
      };

      const response = await visaAPI.submitQuery(payload);

      setSubmittedQueryData({
        ...payload,
        queryId: response.queryId || response.applicationId
      });
      setQueryStep(3);
    } catch (err) {
      console.error('Error submitting query:', err);
      setQueryFormError(err.message || 'Failed to submit your query. Please try again or call us.');
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  const handleResetQueryForm = () => {
    setQueryStep(1);
    setQueryPersonalInfo({
      name: '',
      surname: '',
      email: '',
      phoneCountryCode: '+44',
      phoneLocal: '',
      preferredContact: 'WhatsApp'
    });
    setQueryDetails({
      queryType: 'Group Member Application',
      message: '',
      dynamicAnswers: {}
    });
    setSubmittedQueryData(null);
    setQueryFormError('');
  };

  // Render Query Flow
  const renderQueryFlow = (isSpecialCategory) => {
    if (queryStep === 3 && submittedQueryData) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 bg-white rounded-3xl border border-emerald-200/80 shadow-sm animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 shadow-inner">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200 mb-3">
            Query Received • Ref #QRY-{submittedQueryData.queryId?.toString().padStart(4, '0')}
          </span>
          <h3 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface mb-2">
            Thank You, {submittedQueryData.name}!
          </h3>
          <p className="text-on-surface-variant text-sm max-w-lg mb-6 leading-relaxed">
            Your query has been securely registered in our system. A senior visa consultant will review your profile and reach out via <strong className="text-on-surface">{submittedQueryData.preferredContact}</strong> within 24 business hours.
          </p>

          <div className="w-full max-w-md bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 text-left mb-6 text-xs space-y-2.5">
            <div className="flex justify-between pb-2 border-b border-outline-variant/20">
              <span className="text-outline font-medium">Route:</span>
              <span className="font-bold text-on-surface">{citizenship} → {destination}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-outline-variant/20">
              <span className="text-outline font-medium">Visa Category:</span>
              <span className="font-semibold text-on-surface capitalize">{selectedVisaCategory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-outline font-medium">Query Type:</span>
              <span className="font-semibold text-primary">{submittedQueryData.queryType}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={handleResetQueryForm}
              className="px-5 py-3 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container-low transition-colors"
            >
              Submit Another Query
            </button>
            <button
              onClick={handleStartApplication}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white text-sm font-bold shadow-md shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-2"
            >
              Start Full Application
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">
                {queryStep === 1 ? 'contact_phone' : 'help_center'}
              </span>
            </div>
            <div>
              <h3 className="font-headline text-xl md:text-2xl font-bold text-on-surface">
                {isSpecialCategory ? 'Special Category Consultation' : 'Custom Visa Query'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {queryStep === 1 ? 'Step 1: Contact Information' : 'Step 2: Case Details & Questions'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-full text-xs font-bold text-on-surface">
            <span className={`w-2 h-2 rounded-full ${queryStep === 1 ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`}></span>
            Step {queryStep} of 2
          </div>
        </div>

        {queryFormError && (
          <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-red-600">error</span>
            {queryFormError}
          </div>
        )}

        {queryStep === 1 ? (
          <form onSubmit={handleProceedToQueryDetails} className="flex flex-col gap-5">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/15 text-xs text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">info</span>
              <span>Provide your contact details so our Senior Visa Consultant can review your case and reach you directly.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={queryPersonalInfo.name}
                  onChange={(e) => setQueryPersonalInfo({ ...queryPersonalInfo, name: e.target.value })}
                  placeholder="e.g. David"
                  className="w-full p-3.5 rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-surface-lowest text-sm font-medium transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={queryPersonalInfo.surname}
                  onChange={(e) => setQueryPersonalInfo({ ...queryPersonalInfo, surname: e.target.value })}
                  placeholder="e.g. Smith"
                  className="w-full p-3.5 rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-surface-lowest text-sm font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={queryPersonalInfo.email}
                  onChange={(e) => setQueryPersonalInfo({ ...queryPersonalInfo, email: e.target.value })}
                  placeholder="e.g. david.smith@example.com"
                  className="w-full pl-10 pr-3 py-3.5 rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-surface-lowest text-sm font-medium transition-all"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">mail</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                Phone Number (WhatsApp Preferred) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-12 gap-2">
                <select
                  value={queryPersonalInfo.phoneCountryCode}
                  onChange={(e) => setQueryPersonalInfo({ ...queryPersonalInfo, phoneCountryCode: e.target.value })}
                  className="col-span-4 p-3.5 rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-surface-lowest text-xs font-bold"
                >
                  {countryCodes.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <div className="col-span-8 relative">
                  <input
                    type="tel"
                    value={queryPersonalInfo.phoneLocal}
                    onChange={(e) => setQueryPersonalInfo({ ...queryPersonalInfo, phoneLocal: e.target.value })}
                    placeholder="7123456789"
                    className="w-full pl-10 pr-3 py-3.5 rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-surface-lowest text-sm font-medium transition-all"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">phone</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                Preferred Contact Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'WhatsApp', label: 'WhatsApp', icon: 'chat' },
                  { id: 'Phone Call', label: 'Phone Call', icon: 'call' },
                  { id: 'Email', label: 'Email', icon: 'mail' }
                ].map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setQueryPersonalInfo({ ...queryPersonalInfo, preferredContact: opt.id })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      queryPersonalInfo.preferredContact === opt.id
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 w-full bg-gradient-to-r from-primary to-primary-container text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            >
              Continue to Query Details
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleQuerySubmit} className="flex flex-col gap-5">
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">person</span>
                <span className="font-bold text-on-surface">
                  {queryPersonalInfo.name} {queryPersonalInfo.surname}
                </span>
                <span className="text-outline">
                  • {queryPersonalInfo.email || `${queryPersonalInfo.phoneCountryCode} ${queryPersonalInfo.phoneLocal}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQueryStep(1)}
                className="text-primary font-bold hover:underline cursor-pointer"
              >
                Edit Details
              </button>
            </div>

            {isSpecialCategory ? (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                    Query Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={queryDetails.queryType}
                    onChange={(e) => setQueryDetails({ ...queryDetails, queryType: e.target.value })}
                    className="w-full p-3 rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-surface-lowest text-sm font-medium"
                  >
                    <option value="Group Member Application">Group Member Application</option>
                    <option value="Application for a Minor">Application for a Minor / Child</option>
                    <option value="Urgent / Rush Appointment">Urgent / Rush Appointment Request</option>
                    <option value="Long Stay / Work / Study Visa">Long Stay / Work / Study Visa</option>
                    <option value="Previous Rejection Consultation">Previous Rejection / Appeal Case</option>
                    <option value="Other Special Category">Other Special Category</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                    Message / Explain Your Requirements <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="5"
                    required
                    value={queryDetails.message}
                    onChange={(e) => setQueryDetails({ ...queryDetails, message: e.target.value })}
                    className="w-full p-3.5 rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-surface-lowest text-sm font-medium leading-relaxed"
                    placeholder="Please provide details about your situation (intended travel dates, group size, prior refusals, or questions)..."
                  ></textarea>
                </div>
              </>
            ) : (
              <>
                {queryFormDocs.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
                    <label className="block text-sm font-bold text-on-surface mb-1">{q.name}</label>
                    {q.description && <p className="text-xs text-on-surface-variant mb-3">{q.description}</p>}
                    {q.type === 'textarea' ? (
                      <textarea
                        rows="3"
                        value={queryDetails.dynamicAnswers[q.name] || ''}
                        onChange={(e) => setQueryDetails({
                          ...queryDetails,
                          dynamicAnswers: { ...queryDetails.dynamicAnswers, [q.name]: e.target.value }
                        })}
                        className="w-full p-3 rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface-lowest text-sm"
                        placeholder="Your answer..."
                      ></textarea>
                    ) : q.type === 'checkbox' ? (
                      <label className="flex items-center gap-3 p-3 bg-surface-lowest rounded-xl border border-outline-variant/30 cursor-pointer hover:border-primary/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!queryDetails.dynamicAnswers[q.name]}
                          onChange={(e) => setQueryDetails({
                            ...queryDetails,
                            dynamicAnswers: { ...queryDetails.dynamicAnswers, [q.name]: e.target.checked }
                          })}
                          className="w-5 h-5 accent-primary"
                        />
                        <span className="text-sm font-semibold">Yes, I confirm</span>
                      </label>
                    ) : (
                      <input
                        type={q.type || 'text'}
                        value={queryDetails.dynamicAnswers[q.name] || ''}
                        onChange={(e) => setQueryDetails({
                          ...queryDetails,
                          dynamicAnswers: { ...queryDetails.dynamicAnswers, [q.name]: e.target.value }
                        })}
                        className="w-full p-3 rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface-lowest text-sm"
                        placeholder={q.type === 'date' ? '' : 'Your answer...'}
                      />
                    )}
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface mb-1.5">
                    Additional Notes / Message (Optional)
                  </label>
                  <textarea
                    rows="3"
                    value={queryDetails.message}
                    onChange={(e) => setQueryDetails({ ...queryDetails, message: e.target.value })}
                    className="w-full p-3.5 rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-surface-lowest text-sm"
                    placeholder="Any extra details you'd like our consultant to know..."
                  ></textarea>
                </div>
              </>
            )}

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setQueryStep(1)}
                disabled={isSubmittingQuery}
                className="w-1/3 py-3.5 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isSubmittingQuery}
                className="w-2/3 bg-gradient-to-r from-primary to-primary-container text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingQuery ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Submitting Query...
                  </>
                ) : (
                  <>
                    Submit Query
                    <span className="material-symbols-outlined text-sm">send</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50/60 pt-28 md:pt-32 pb-24">
      {/* Route Switcher Modal */}
      {isEditingRoute && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-outline-variant/20 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">swap_horiz</span>
                </div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Change Visa Route</h3>
              </div>
              <button
                onClick={() => setIsEditingRoute(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-outline transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleApplyNewRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
                  Your Citizenship / Passport
                </label>
                <select
                  value={tempCitizenship}
                  onChange={(e) => setTempCitizenship(e.target.value)}
                  className="w-full bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 text-on-surface font-medium focus:ring-2 focus:ring-primary/30"
                >
                  {allCitizenships.length > 0 ? (
                    allCitizenships.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  ) : (
                    <option value={citizenship}>{citizenship}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-outline mb-1.5">
                  Destination Country
                </label>
                <select
                  value={tempDestination}
                  onChange={(e) => setTempDestination(e.target.value)}
                  className="w-full bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 text-on-surface font-medium focus:ring-2 focus:ring-primary/30"
                >
                  {allDestinations.length > 0 ? (
                    allDestinations.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))
                  ) : (
                    <option value={destination}>{destination}</option>
                  )}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingRoute(false)}
                  className="flex-1 py-3 rounded-xl border border-outline-variant text-sm font-semibold hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:opacity-95 transition-all cursor-pointer"
                >
                  Update Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-on-surface-variant font-medium mb-5">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">home</span>
            Home
          </Link>
          <span className="text-outline">/</span>
          <span className="text-outline">Visa Checklist</span>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-semibold truncate max-w-xs">{citizenship} to {destination}</span>
        </nav>

        {/* Executive Header Section: Destination & Verified Route */}
        <div className="relative rounded-3xl bg-white/95 backdrop-blur-xl p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/60 border border-slate-200/90 mb-6 overflow-hidden">
          {/* Subtle Ambient Decorative Gradient Backdrops */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-primary/10 via-rose-100/30 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-100/40 via-indigo-50/30 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200/80 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  OFFICIAL EMBASSY REQUIREMENTS
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-primary font-bold text-xs border border-primary/20 shadow-xs">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  VERIFIED FOR 2025/2026 TRAVEL
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200/70">
                  <span className="material-symbols-outlined text-xs text-sky-600">sync</span>
                  Live Consulate Feed
                </span>
              </div>

              <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Visa Requirements for{' '}
                <span className="bg-gradient-to-r from-primary via-rose-500 to-secondary text-transparent bg-clip-text">
                  {destination}
                </span>
              </h1>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Consulate-verified documentation checklist and official visa filing procedure for{' '}
                <strong className="text-slate-900 font-semibold">{citizenship}</strong> passport holders traveling to{' '}
                <strong className="text-slate-900 font-semibold">{destination}</strong>.
              </p>
            </div>

            {/* Route Card Capsule */}
            <div className="shrink-0">
              <div className="bg-gradient-to-b from-slate-50 to-slate-100/70 rounded-2xl p-4 sm:p-4.5 border border-slate-200/90 shadow-xs flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-3">
                  {/* Origin */}
                  <div className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <span className="text-2xl filter drop-shadow-xs">{getCountryFlag(citizenship)}</span>
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Passport</p>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[110px]">{citizenship}</p>
                    </div>
                  </div>

                  {/* Flight / Route Connector */}
                  <div className="flex flex-col items-center justify-center px-1">
                    <div className="flex items-center gap-1 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                      <span className="w-4 h-[1px] border-t border-dashed border-primary/50"></span>
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-sm">flight</span>
                      </div>
                      <span className="w-4 h-[1px] border-t border-dashed border-primary/50"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-600 mt-1 uppercase tracking-wider">Route</span>
                  </div>

                  {/* Destination */}
                  <div className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <span className="text-2xl filter drop-shadow-xs">{getCountryFlag(destination)}</span>
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Destination</p>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{destination}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTempCitizenship(citizenship);
                    setTempDestination(destination);
                    setIsEditingRoute(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-xs">edit</span>
                  Change Visa Route
                </button>
              </div>
            </div>
          </div>

          {/* Trust Markers Strip */}
          <div className="relative z-10 mt-7 pt-6 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <span className="material-symbols-outlined text-base">verified_user</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">100% Embassy Compliant</p>
                <p className="text-[10px] text-slate-600 truncate">Vetted consular criteria</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                <span className="material-symbols-outlined text-base">bolt</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">Fast-Track Available</p>
                <p className="text-[10px] text-slate-600 truncate">Priority consulate slots</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <span className="material-symbols-outlined text-base">verified</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">Guaranteed Review</p>
                <p className="text-[10px] text-slate-600 truncate">100% Pre-check compliance</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-primary flex items-center justify-center shrink-0 border border-rose-100">
                <span className="material-symbols-outlined text-base">support_agent</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">Dedicated Case Officer</p>
                <p className="text-[10px] text-slate-600 truncate">1-on-1 legal review</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transparent 3-Step Customer Journey Timeline */}
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
              <h3 className="font-headline font-bold text-sm text-on-surface">
                How Your Visa Application & Filing Works
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Transparent 3-Step Process
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Step 1 */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-primary/5 border border-primary/25 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-primary text-white font-headline font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                1
              </div>
              <div className="min-w-0 pr-10">
                <h4 className="font-bold text-xs text-on-surface">Review Checklist & Select Profile</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  Choose your applicant status and review required paperwork before beginning.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 font-headline font-extrabold text-sm flex items-center justify-center shrink-0">
                2
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Next Step</span>
                <h4 className="font-bold text-xs text-on-surface">Submit Details & Upload Documents</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  Lock in your dedicated case officer and upload available documents in 5 minutes.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 font-headline font-extrabold text-sm flex items-center justify-center shrink-0">
                3
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline">Final Clearance</span>
                <h4 className="font-bold text-xs text-on-surface">Dossier Audit & Appointment Booked</h4>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  We audit your dossier, issue flight/hotel vouchers, book consulate slot, and grant visa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && !visaData ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <h3 className="font-headline font-bold text-base text-on-surface mt-4">Retrieving Official Requirements...</h3>
            <p className="text-xs text-on-surface-variant">Connecting to verified consulate databases for {destination}</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-8 rounded-3xl mb-8 border border-red-200 text-center shadow-sm">
            <span className="material-symbols-outlined text-4xl text-red-600 mb-2">error</span>
            <h3 className="font-bold text-base mb-1">Unable to Load Requirements</h3>
            <p className="text-xs max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={fetchVisaRequirements}
              className="bg-red-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors text-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Horizontal Profile & Travel Purpose Selection Bar */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs mb-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Applicant Profile Selection */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <span className="material-symbols-outlined text-base">badge</span>
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface">1. Applicant Profile</h3>
                      <p className="text-[11px] text-on-surface-variant">Select your employment status to customize required paperwork</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeCategoriesList.map((cat) => {
                      const isSelected = selectedCategory === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.key);
                            if (cat.key === 'other') {
                              setQueryStep(1);
                            }
                          }}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">{cat.icon}</span>
                          <span>{cat.label}</span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Travel Purpose Selection */}
                {selectedCategory !== 'other' && (
                  <div className="lg:border-l lg:border-slate-200 lg:pl-6 shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary font-bold">
                        <span className="material-symbols-outlined text-base">flight_takeoff</span>
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface">2. Travel Purpose</h3>
                        <p className="text-[11px] text-on-surface-variant">Select your intended visa category</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeVisaCategoriesList.map((vc) => {
                        const isSelected = selectedVisaCategory === vc.key;
                        return (
                          <button
                            key={vc.key}
                            type="button"
                            onClick={() => setSelectedVisaCategory(vc.key)}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-secondary text-white shadow-sm ring-2 ring-secondary/30'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">{vc.icon}</span>
                            <span>{vc.label}</span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-sm">check</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main 2-Column Responsive Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start mb-12">
              
              {/* Left Column: Interactive Document Dossier (Main Content) */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col">
                {selectedCategory === 'other' ? (
                  renderQueryFlow(true)
                ) : (
                  <>
                    {/* Tabs Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
                      <div>
                        <h2 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">
                          Required Documents Dossier
                        </h2>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Interactive preparation checklist for your <strong className="text-on-surface font-semibold capitalize">{selectedVisaCategory} Visa</strong>
                        </p>
                      </div>

                      {/* Preparation Progress Meter */}
                      {activeTab !== 'query' && currentDocsList.length > 0 && (
                        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-2xl border border-slate-200 text-xs self-start sm:self-auto">
                          <span className="text-outline font-medium">Ready:</span>
                          <span className="font-bold text-on-surface">
                            {checkedCount}/{currentDocsList.length}
                          </span>
                          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex border-b border-slate-200 mb-6 overflow-x-auto gap-2">
                      <button
                        className={`px-5 py-3.5 font-headline font-bold text-xs sm:text-sm transition-all relative shrink-0 flex items-center gap-2 cursor-pointer ${
                          activeTab === 'now' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                        onClick={() => setActiveTab('now')}
                      >
                        <span className="material-symbols-outlined text-base">assignment_turned_in</span>
                        Required Upfront (Phase 1)
                        <span className="text-[11px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
                          {docsRequiredNow.length}
                        </span>
                        {activeTab === 'now' && (
                          <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-primary"></div>
                        )}
                      </button>

                      {docsRequiredLater.length > 0 && (
                        <button
                          className={`px-5 py-3.5 font-headline font-bold text-xs sm:text-sm transition-all relative shrink-0 flex items-center gap-2 cursor-pointer ${
                            activeTab === 'later' ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                          onClick={() => setActiveTab('later')}
                        >
                          <span className="material-symbols-outlined text-base">event_available</span>
                          Consular Appointment (Phase 2)
                          <span className="text-[11px] bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full font-bold">
                            {docsRequiredLater.length}
                          </span>
                          {activeTab === 'later' && (
                            <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-secondary"></div>
                          )}
                        </button>
                      )}

                      {queryFormDocs.length > 0 && (
                        <button
                          className={`px-5 py-3.5 font-headline font-bold text-xs sm:text-sm transition-all relative shrink-0 flex items-center gap-2 cursor-pointer ${
                            activeTab === 'query' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                          onClick={() => {
                            setActiveTab('query');
                            setQueryStep(1);
                          }}
                        >
                          <span className="material-symbols-outlined text-base">help_outline</span>
                          Query Form
                          {activeTab === 'query' && (
                            <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-primary"></div>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Tab Body */}
                    <div className="flex flex-col gap-3.5 flex-grow">
                      {activeTab === 'now' ? (
                        docsRequiredNow.length > 0 ? (
                          <>
                            {/* Readiness status guidance banner */}
                            {progressPercent === 100 ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-center justify-between gap-3 mb-2 shadow-2xs animate-fade-in">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0">check_circle</span>
                                  <div>
                                    <strong className="font-bold text-emerald-800 text-sm">All Upfront Documents Ready!</strong>
                                    <p className="text-emerald-700 mt-0.5">Your checklist is complete. Proceed to submit your application and our legal team will begin verification today.</p>
                                  </div>
                                </div>
                                <button
                                  onClick={handleStartApplication}
                                  className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                                >
                                  Apply Now
                                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                              </div>
                            ) : (
                              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3.5 text-xs text-on-surface-variant flex items-center gap-2.5 mb-1">
                                <span className="material-symbols-outlined text-primary text-lg shrink-0">info</span>
                                <span>
                                  <strong>Phase 1 documents</strong> are required to initiate your application dossier and secure early appointment slots. Click items to check them off as you prepare.
                                </span>
                              </div>
                            )}

                            {docsRequiredNow.map((doc, idx) => {
                              const isChecked = !!checkedDocs[doc.name];
                              const iconInfo = getDocIconInfo(doc.name);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => toggleDocChecked(doc.name)}
                                  className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none ${
                                    isChecked
                                      ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs ring-1 ring-emerald-400/20'
                                      : 'bg-surface-container-lowest border-slate-200 hover:border-primary/40 hover:bg-slate-50/60 shadow-2xs'
                                  }`}
                                >
                                  <div className="mt-1 shrink-0">
                                    <div
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                                        isChecked
                                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                          : 'border-slate-300 bg-white text-transparent hover:border-primary'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-sm">check</span>
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-xs ${iconInfo.bg}`}>
                                          <span className="material-symbols-outlined text-base">{iconInfo.icon}</span>
                                        </div>
                                        <h4 className={`font-bold text-sm sm:text-base ${isChecked ? 'text-emerald-950 line-through opacity-85' : 'text-on-surface'}`}>
                                          {doc.name}
                                        </h4>
                                      </div>
                                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                        isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-outline'
                                      }`}>
                                        {isChecked ? 'Verified Ready' : 'Mandatory Upfront'}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed pl-10">
                                      {doc.description}
                                    </p>
                                    <div className="flex flex-wrap items-center justify-between gap-2 pl-10 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                                      <span className="text-slate-500 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs text-primary">verified</span>
                                        Embassy standard: Color scan (PDF or JPG), all 4 corners visible, clear text.
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenWhatsApp(`Hi Zoltan Team! I am reviewing the checklist for ${destination} (${selectedCategory}) and have a question about the required document: "${doc.name}". Could you guide me?`);
                                        }}
                                        className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                                      >
                                        <span className="material-symbols-outlined text-xs">help_outline</span>
                                        Ask advisor about this
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <div className="text-center py-16 bg-surface-container-lowest rounded-3xl border border-slate-200 border-dashed">
                            <span className="material-symbols-outlined text-4xl text-outline mb-2">description</span>
                            <p className="text-on-surface-variant text-sm font-medium">
                              No specific upfront documents required for this category.
                            </p>
                          </div>
                        )
                      ) : activeTab === 'later' ? (
                        docsRequiredLater.length > 0 ? (
                          <>
                            <div className="bg-secondary/5 border border-secondary/15 rounded-2xl p-4 text-xs text-on-surface-variant flex items-center gap-2.5 mb-1">
                              <span className="material-symbols-outlined text-secondary text-lg shrink-0">event_available</span>
                              <span>
                                <strong>Phase 2 documents</strong> are presented during your embassy biometric appointment or interview. Zoltan arranges your verified flight itinerary, hotel booking vouchers, and travel insurance to accompany these.
                              </span>
                            </div>

                            {docsRequiredLater.map((doc, idx) => {
                              const isChecked = !!checkedDocs[doc.name];
                              const iconInfo = getDocIconInfo(doc.name);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => toggleDocChecked(doc.name)}
                                  className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none ${
                                    isChecked
                                      ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                                      : 'bg-surface-container-lowest border-slate-200 hover:border-secondary/40 hover:bg-slate-50/60 shadow-2xs'
                                  }`}
                                >
                                  <div className="mt-1 shrink-0">
                                    <div
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                                        isChecked
                                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                          : 'border-slate-300 bg-white text-transparent hover:border-secondary'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-sm">check</span>
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-xs ${iconInfo.bg}`}>
                                          <span className="material-symbols-outlined text-base">{iconInfo.icon}</span>
                                        </div>
                                        <h4 className={`font-bold text-sm sm:text-base ${isChecked ? 'text-emerald-950 line-through opacity-85' : 'text-on-surface'}`}>
                                          {doc.name}
                                        </h4>
                                      </div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary/10 text-secondary">
                                        Appointment Phase
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed pl-10">
                                      {doc.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <div className="text-center py-16 bg-surface-container-lowest rounded-3xl border border-slate-200 border-dashed">
                            <span className="material-symbols-outlined text-4xl text-outline mb-2">fact_check</span>
                            <p className="text-on-surface-variant text-sm font-medium">
                              No additional appointment documents required for this selection.
                            </p>
                          </div>
                        )
                      ) : (
                        renderQueryFlow(false)
                      )}
                    </div>

                    {/* Ready to Proceed Bottom Action Strip */}
                    <div className="mt-8 p-5 bg-gradient-to-r from-surface-container-low to-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <span className="material-symbols-outlined text-2xl">verified_user</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-on-surface">Ready to start your {destination} visa?</h4>
                          <p className="text-xs text-on-surface-variant">Submit your details online in 5 minutes. A dedicated senior case officer is assigned immediately.</p>
                        </div>
                      </div>
                      <button
                        onClick={handleStartApplication}
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-container text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        Start Application
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>

                    {/* Consular Disclaimer Note */}
                    <div className="mt-6 pt-4 border-t border-slate-200 flex items-start gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">info</span>
                      <span>
                        <strong>Consular Notice:</strong> In select cases, the diplomatic mission or consular officer reserves the right to request additional supporting documents. Our dedicated consultant will coordinate directly with you if required.
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Compact Sticky Order & Application Filing Card */}
              <div className="lg:col-span-4 lg:sticky lg:top-28">
                <div className="bg-white rounded-3xl p-6 border-2 border-primary/25 shadow-xl flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">verified</span>
                      <span className="font-headline font-bold text-sm text-on-surface uppercase tracking-wider">
                        Application Summary
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Official Assistance
                    </span>
                  </div>

                  {/* Application Route & Filing Overview */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-4 shadow-md space-y-3 border border-slate-800">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300">Filing Route:</span>
                        <span className="text-xs font-bold text-white truncate max-w-[170px]">{citizenship} → {destination}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Assistance Level:</span>
                        <span className="font-bold text-emerald-400">Full Concierge Review</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Legal Case Officer:</span>
                        <span className="font-medium text-slate-200">Assigned Upon Submission</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <p className="text-[11px] text-slate-400 leading-snug">
                        🔒 Official Guarantee: Complete consulate compliance audit, verified flight & accommodation vouchers, and priority appointment booking.
                      </p>
                    </div>
                  </div>

                  {/* What's Included In Service Checklist */}
                  <div className="space-y-2 py-1">
                    <p className="text-xs font-bold text-on-surface">What's Included in Your Service:</p>
                    <div className="space-y-1.5 text-xs text-on-surface-variant">
                      {whatsIncludedPoints.map((pt, idx) => (
                        <div key={`wi-${idx}`} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-sm shrink-0 mt-0.5">check_circle</span>
                          <span className="text-slate-700 font-medium">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Readiness Meter */}
                  {selectedCategory !== 'other' && currentDocsList.length > 0 && (
                    <div className="bg-surface-container-low p-3.5 rounded-2xl border border-slate-200/60 space-y-2">
                      <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-outline">Dossier Readiness Tracker</span>
                        <span className={`font-bold ${progressPercent === 100 ? 'text-emerald-600' : 'text-primary'}`}>
                          {checkedCount}/{currentDocsList.length} Items ({progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Primary Action CTA */}
                  <button
                    onClick={handleStartApplication}
                    className="w-full bg-gradient-to-r from-primary via-primary-container to-secondary text-white font-headline font-bold py-4 px-5 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide group"
                  >
                    <span>Start Visa Application</span>
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-500 -mt-1">
                    Takes ~5 minutes • Dedicated legal case officer assigned immediately
                  </p>

                  {/* Security & Compliance Badges */}
                  <div className="text-center space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-outline font-medium">
                      <span className="material-symbols-outlined text-xs text-emerald-600">lock</span>
                      <span>256-Bit SSL Bank-Grade Encryption</span>
                      <span>•</span>
                      <span>GDPR Compliant Data Privacy</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-[10px] text-slate-700 border border-slate-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-600">verified_user</span>
                        Consular Verified
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-[10px] text-slate-700 border border-slate-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-sky-600">security</span>
                        Encrypted Dossier
                      </span>
                    </div>
                  </div>

                  {/* Instant Support */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-outline">Need advice before applying?</span>
                    <button
                      onClick={() => handleOpenWhatsApp()}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="material-symbols-outlined text-sm">chat</span>
                      WhatsApp Advisor
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

        {/* Customer Trust FAQs Accordion Section */}
        <div className="mt-4 bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-slate-200/80 shadow-xs">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs mb-3">
              <span className="material-symbols-outlined text-sm">help</span>
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h3 className="font-headline text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Everything You Need to Know Before Applying
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-2">
              Key information regarding document preparation, legal dossier audit, and consular filing procedures.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 overflow-hidden transition-all duration-200 bg-surface-container-lowest"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-headline font-bold text-sm text-on-surface pr-2">
                      {faq.q}
                    </span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen ? 'bg-primary text-white rotate-180' : 'bg-slate-100 text-slate-600'}`}>
                      <span className="material-symbols-outlined text-base">expand_more</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-on-surface-variant leading-relaxed border-t border-slate-100 bg-slate-50/40 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Need Assistance Hotline Strip */}
          <div className="mt-8 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-xl">support_agent</span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-emerald-950">Still have questions about your application?</h4>
                <p className="text-[11px] text-emerald-800">Our senior visa consultants are online right now to review your profile for free.</p>
              </div>
            </div>
            <button
              onClick={() => handleOpenWhatsApp()}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              Chat with Consultant
            </button>
          </div>
        </div>

      </div>

      {/* Mobile Sticky Bottom CTA Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 shadow-xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface truncate capitalize">{destination} • Official Filing</p>
            <p className="text-[11px] text-outline">{docsRequiredNow.length} Phase 1 Documents Required</p>
          </div>
          <button
            onClick={handleStartApplication}
            className="bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            Start Application
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </main>
  );
};

export default ChecklistPage;
