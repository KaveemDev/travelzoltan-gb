import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { visaAPI } from '../services/api';
import DocumentUpload from '../components/DocumentUpload';
import TravelVisaAgreementModal from '../components/TravelVisaAgreementModal';
import { compressImageFile } from '../utils/imageCompressor';
import { hasPayInFullOption, getPayNowPoints, getPayInFullPoints, resolvePointText } from '../utils/paymentUtils';
import { DEFAULT_PERSONAL_DETAILS_FIELDS } from '../constants/visaConfig';
import { getApplyFlow } from '../constants/applyFlow';
import {
  AGREEMENT_TITLE,
  AGREEMENT_SUBTITLE,
  AGREEMENT_VERSION,
  CLIENT_DECLARATIONS,
  RAW_AGREEMENT_TEXT
} from '../data/travelVisaAgreementData';

const countryCodes = [
  { code: '+44', flag: '🇬🇧' },
  { code: '+1', flag: '🇺🇸' },
  { code: '+91', flag: '🇮🇳' },
  { code: '+61', flag: '🇦🇺' },
  { code: '+971', flag: '🇦🇪' },
  { code: '+49', flag: '🇩🇪' },
  { code: '+33', flag: '🇫🇷' },
  { code: '+39', flag: '🇮🇹' },
  { code: '+34', flag: '🇪🇸' }
];

const countriesList = [
  "United Kingdom", "India", "United States", "Canada", "Australia",
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

// Rates must match EXCHANGE_RATES in the server's createPaymentOrder
const CURRENCIES = {
  GBP: { symbol: '£', name: 'GBP', rate: 1.0 },
  USD: { symbol: '$', name: 'USD', rate: 1.30 },
  EUR: { symbol: '€', name: 'EUR', rate: 1.18 },
  INR: { symbol: '₹', name: 'INR', rate: 108.0 }
};

// Admin field ids (form_schema.personal_details_fields) -> applicant form keys.
// Older routes stored settings under the form key itself (e.g. destinationAddress), so both are read.
const DETAIL_FIELDS = [
  { id: 'first_name', name: 'name', label: 'Given names' },
  { id: 'last_name', name: 'surname', label: 'Surname' },
  { id: 'date_of_birth', name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { id: 'nationality', name: 'nationality', label: 'Nationality', type: 'country' },
  { id: 'email', name: 'email', label: 'Email', type: 'email', hint: 'Your confirmation goes here.' },
  { id: 'phone', name: 'phoneLocal', code: 'phoneCountryCode', label: 'Phone (WhatsApp)', type: 'phone', hint: 'Pick your country code, then your number.' },
  { id: 'alternative_phone', name: 'alternativePhoneLocal', code: 'alternativePhoneCountryCode', label: 'Alternative phone', type: 'phone' },
  { id: 'passport_number', name: 'passportNumber', label: 'Passport number' },
  { id: 'passport_expiry', name: 'passportExpiry', label: 'Passport expiry date', type: 'date' },
  { id: 'residential_address', name: 'residentialAddress', label: 'Residential address', type: 'textarea' },
  { id: 'destination_address', name: 'destinationAddress', label: 'Address in destination country', type: 'textarea' },
  { id: 'accommodation_address', name: 'accommodationAddress', label: 'Family / friend or hotel address', type: 'textarea' }
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysUntil = (iso) => iso ? Math.ceil((new Date(iso) - new Date(todayISO())) / 86400000) : null;
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '';
const money = (n, curr) => `${curr.symbol}${(Math.round(n * curr.rate * 100) / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;

const inputClass = 'w-full bg-white border border-outline-variant/40 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition';

const ApplicationProgressPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const citizenship = searchParams.get('citizenship') || location.state?.citizenship || 'United Kingdom';
  const destination = searchParams.get('destination') || location.state?.destination || 'Europe (Schengen States)';
  const initialVisaData = location.state?.visaData || null;

  const [visaData, setVisaData] = useState(initialVisaData);
  const [loading, setLoading] = useState(!initialVisaData);
  const [error, setError] = useState(null);
  const [visaOptions, setVisaOptions] = useState([]);
  const loadedRoute = useRef(initialVisaData ? `${citizenship}|${destination}` : null);

  const [maxReached, setMaxReached] = useState(0);
  // Arriving with a route already picked (checklist / landing page) skips straight past the Destination step
  const [arrivedWithRoute] = useState(() => searchParams.has('citizenship') && searchParams.has('destination'));
  const [stepError, setStepError] = useState(null);
  const [busy, setBusy] = useState('');
  const isSubmittingRef = useRef(false);

  const [form, setForm] = useState({
    applicantStatus: searchParams.get('category') || location.state?.selectedCategory || '',
    visaCategory: searchParams.get('visaType') || location.state?.selectedVisaCategory || 'tourist',
    centre: '',
    departureDate: '',
    travellers: 1,
    name: '',
    surname: '',
    email: '',
    phoneCountryCode: '+44',
    phoneLocal: '',
    alternativePhoneCountryCode: '+44',
    alternativePhoneLocal: '',
    passportNumber: '',
    passportExpiry: '',
    nationality: citizenship,
    dateOfBirth: '',
    residentialAddress: '',
    destinationAddress: '',
    accommodationAddress: '',
    package: '',
    preferredAppointmentDate: searchParams.get('appointmentDate') || location.state?.preferredAppointmentDate || ''
  });

  const [coreDocuments, setCoreDocuments] = useState({});
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [applicationId, setApplicationId] = useState(null);

  const [paymentOption, setPaymentOption] = useState('partial');
  const [currency, setCurrency] = useState('GBP');
  const [submitted, setSubmitted] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);

  useEffect(() => {
    visaAPI.getVisaOptions().then(d => setVisaOptions(d.configurations || [])).catch(() => {});
  }, []);

  const fetchVisaRequirements = async () => {
    try {
      setLoading(true);
      setError(null);
      setVisaData(await visaAPI.getVisaRequirements(citizenship, destination));
      loadedRoute.current = `${citizenship}|${destination}`;
    } catch (err) {
      setError(err?.message || (typeof err === 'string' ? err : 'Failed to load visa requirements'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadedRoute.current !== `${citizenship}|${destination}`) fetchVisaRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizenship, destination]);

  if (!visaData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        {error ? (
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-outline-variant/30 max-w-md w-full text-center space-y-4">
            <h2 className="text-2xl font-bold text-on-surface">Failed to load details</h2>
            <p className="text-on-surface-variant text-sm">{error}</p>
            <button onClick={fetchVisaRequirements} className="bg-primary text-white font-bold px-6 py-3 rounded-full">Try again</button>
          </div>
        ) : (
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        )}
      </div>
    );
  }

  // ---------- derived config ----------
  const flow = getApplyFlow(visaData.form_schema, visaData.appointment_data);
  const fieldsConfig = visaData.form_schema?.personal_details_fields || {};
  const fieldSetting = (id, name) => fieldsConfig[id] || fieldsConfig[name] || {};
  const applicantStatus = form.applicantStatus || 'employed';
  const docsByCategory = visaData.required_documents?.[form.visaCategory] || visaData.required_documents?.tourist || {};
  const coreDocsConfig = (docsByCategory[applicantStatus] || docsByCategory.employed || {}).now || [];
  const steps = flow.steps.filter(s =>
    s.enabled &&
    !(s.key === 'centre' && !flow.centres.length) &&
    !(s.key === 'support' && !flow.packages.length) &&
    !(s.key === 'documents' && !coreDocsConfig.length) &&
    // the Form Schema tab's Applicant Status / Visa Category toggles hide their steps too
    !(s.key === 'status' && fieldSetting('applicant_status').visible === false) &&
    !(s.key === 'purpose' && fieldSetting('visa_category').visible === false)
  );
  const startIdx = arrivedWithRoute && steps[0].key === 'destination' && steps.length > 1 ? 1 : 0;
  const reach = Math.max(maxReached, startIdx);
  const requested = steps.findIndex(s => s.key === searchParams.get('step'));
  const idx = requested >= 0 && requested <= reach ? requested : startIdx;
  const step = steps[idx];

  const detailFields = DETAIL_FIELDS.map(f => {
    const def = DEFAULT_PERSONAL_DETAILS_FIELDS.find(d => d.id === f.id) || { defaultVisible: true, defaultRequired: false };
    const custom = fieldSetting(f.id, f.name);
    return {
      ...f,
      visible: custom.visible !== undefined ? !!custom.visible : def.defaultVisible,
      required: custom.required !== undefined ? !!custom.required : def.defaultRequired
    };
  }).filter(f => f.visible);

  const purpose = flow.purposes.find(p => p.key === form.visaCategory);
  const status = flow.statuses.find(p => p.key === form.applicantStatus);
  const pkg = flow.packages.find(p => p.key === form.package);
  const curr = CURRENCIES[currency];
  const travellers = form.travellers;

  // Pricing mirrors createPaymentOrder on the server
  const serviceFee = visaData.service_fee;
  const feeObj = typeof serviceFee === 'object' && serviceFee !== null ? serviceFee : null;
  const routeTotal = feeObj ? (feeObj.total_amount || (feeObj.admin_fee || 0) + (feeObj.service_fee || 0) + (feeObj.express_fee || 0)) : (parseFloat(serviceFee) || 130);
  let payOptions;
  if (pkg) {
    const price = parseFloat(pkg.price) || 0;
    const now = parseFloat(pkg.pay_now_amount) || 0;
    payOptions = [
      now > 0 && now < price && {
        id: 'partial',
        title: `Pay ${money(now * travellers, curr)} now, the rest later`,
        badge: 'Popular',
        amount: now * travellers,
        balance: (price - now) * travellers,
        lines: [`${money((price - now) * travellers, curr)} balance, paid once your appointment is booked or, for visas without an appointment, before your application is submitted. No extra charge.`]
      },
      { id: 'full', title: 'Pay in full', amount: price * travellers, balance: 0, lines: ['Settle the whole service fee today and nothing more to pay us.'] }
    ].filter(Boolean);
  } else {
    const now = feeObj?.pay_now_amount || routeTotal;
    const full = feeObj?.pay_in_full_amount || routeTotal;
    payOptions = [
      { id: 'partial', title: now < routeTotal ? `Pay ${money(now * travellers, curr)} now, the rest later` : 'Pay now', amount: now * travellers, balance: Math.max(0, routeTotal - now) * travellers, lines: getPayNowPoints(serviceFee).map(p => resolvePointText(p, (now * curr.rate).toFixed(2), curr.symbol)) },
      hasPayInFullOption(serviceFee) && { id: 'full', title: 'Pay in full', amount: full * travellers, balance: 0, lines: getPayInFullPoints(serviceFee).map(p => resolvePointText(p, (full * curr.rate).toFixed(2), curr.symbol)) }
    ].filter(Boolean);
  }
  const selectedPay = payOptions.find(o => o.id === paymentOption) || payOptions[0];

  // ---------- helpers ----------
  const fullName = `${form.name} ${form.surname}`.trim();
  const update = (patch) => {
    setStepError(null);
    setForm(prev => ({ ...prev, ...patch }));
  };

  const setParams = (patch) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => p.set(k, v));
      return p;
    });
  };

  const goTo = (i) => {
    setStepError(null);
    setParams({ step: steps[i].key });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildAgreementPayload = () => ({
    agreed: true,
    agreedAt: new Date().toISOString(),
    clientName: fullName || 'Applicant',
    clientEmail: form.email,
    clientPhone: `${form.phoneCountryCode} ${form.phoneLocal}`.trim(),
    clientPassport: form.passportNumber,
    citizenship,
    destination,
    visaCategory: form.visaCategory,
    applicantStatus,
    agreementTitle: AGREEMENT_TITLE,
    agreementSubtitle: AGREEMENT_SUBTITLE,
    agreementVersion: AGREEMENT_VERSION,
    agreementText: RAW_AGREEMENT_TEXT,
    declarationsAccepted: CLIENT_DECLARATIONS
  });

  const buildUserData = (extra = {}) => ({
    ...form,
    fullName,
    phone: `${form.phoneCountryCode} ${form.phoneLocal}`.trim(),
    alternativePhone: form.alternativePhoneLocal ? `${form.alternativePhoneCountryCode} ${form.alternativePhoneLocal}`.trim() : '',
    citizenship,
    destination,
    applicantStatus,
    packageTitle: pkg?.title || '',
    ...extra
  });

  const saveApplication = async (extra = {}) => {
    const configuration_id = visaData.configuration_id || 1;
    if (applicationId) {
      await visaAPI.updateApplication(applicationId, { configuration_id, user_data: buildUserData(extra) });
      return applicationId;
    }
    const res = await visaAPI.createApplication({ configuration_id, user_data: buildUserData({ status: 'Documents Pending', ...extra }) });
    setApplicationId(res.applicationId);
    return res.applicationId;
  };

  const validate = () => {
    switch (step.key) {
      case 'destination':
        return citizenship && destination ? null : 'Choose your passport and destination.';
      case 'status':
        return status ? null : 'Choose the option that best describes you.';
      case 'purpose':
        return purpose ? null : 'Choose what the trip is for.';
      case 'centre':
        return flow.centres.some(c => c.name === form.centre) ? null : 'Choose where you will apply.';
      case 'dates':
        if (!form.departureDate) return 'Add your departure date.';
        return form.departureDate < todayISO() ? 'The departure date is in the past.' : null;
      case 'details': {
        const missing = detailFields.filter(f => f.required && !String(form[f.name] || '').trim()).map(f => f.label);
        if (missing.length) return `Please fill in: ${missing.join(', ')}.`;
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email address.';
        if (form.passportExpiry && form.departureDate && form.passportExpiry < form.departureDate) return 'Your passport expires before your departure date.';
        return null;
      }
      case 'documents':
        return coreDocsConfig.every(d => coreDocuments[d.name]) ? null : 'Please upload every document before continuing.';
      case 'support':
        return pkg ? null : 'Choose a support package.';
      default:
        return null;
    }
  };

  const uploadDocuments = async (appId) => {
    const entries = Object.entries(coreDocuments);
    for (let i = 0; i < entries.length; i++) {
      const [docType, rawFile] = entries[i];
      setBusy(`Uploading ${i + 1}/${entries.length}...`);
      const file = await compressImageFile(rawFile, { maxDimension: 2000, quality: 0.82 });
      const data = new FormData();
      data.append('documents', file);
      data.append('document_types', JSON.stringify([docType.trim()]));
      await visaAPI.uploadDocuments(appId, data);
    }
    setDocsUploaded(true);
  };

  const handleNext = async () => {
    if (isSubmittingRef.current || loading) return;
    const err = validate();
    if (err) {
      setStepError(err);
      return;
    }
    try {
      isSubmittingRef.current = true;
      if (step.key === 'details' || applicationId) {
        setBusy('Saving...');
        const appId = await saveApplication();
        if (step.key === 'documents' && !docsUploaded) await uploadDocuments(appId);
      }
    } catch (e) {
      const is413 = e?.status === 413 || String(e?.message || e).includes('413');
      setStepError(is413 ? 'A document is too large. Please upload a file under 5MB.' : (e?.message || 'Something went wrong. Please try again.'));
      return;
    } finally {
      isSubmittingRef.current = false;
      setBusy('');
    }
    setMaxReached(m => Math.max(m, idx + 1));
    goTo(idx + 1);
  };

  const openRazorpay = (appId, order) => new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('The payment window could not load. Please refresh and try again.'));
      return;
    }
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'ZoltanVisa',
      description: 'Visa Application Service Fee',
      order_id: order.orderId,
      handler: async (response) => {
        try {
          await visaAPI.verifyPayment({
            applicationId: appId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      prefill: { name: fullName, email: form.email, contact: `${form.phoneCountryCode}${form.phoneLocal}` },
      theme: { color: '#ff3366' },
      modal: { ondismiss: () => reject(new Error('Payment was cancelled. Your application is saved and you can pay any time.')) }
    });
    rzp.open();
  });

  const handlePay = async () => {
    if (isSubmittingRef.current) return;
    if (!agreementAccepted) {
      setStepError('Please accept the Visa Assistance Agreement to continue.');
      return;
    }
    try {
      isSubmittingRef.current = true;
      setStepError(null);
      setBusy('Preparing payment...');
      const appId = await saveApplication({
        paymentOption: selectedPay.id,
        paymentCurrency: currency,
        paymentAmountGBP: selectedPay.amount,
        agreement: buildAgreementPayload()
      });
      const order = await visaAPI.createPaymentOrder(appId, currency, selectedPay.id);
      setBusy('Waiting for payment...');
      await openRazorpay(appId, order);
      setSubmitted(true);
    } catch (e) {
      setStepError(e?.message || 'Payment failed. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setBusy('');
    }
  };

  const changeRoute = (patch) => {
    setMaxReached(0);
    setParams(patch);
  };

  // ---------- step bodies ----------
  const citizenships = [...new Set(visaOptions.map(o => o.citizenship))];
  const destinations = visaOptions.filter(o => o.citizenship === citizenship).map(o => o.destination);

  const selectCard = (selected) => `relative text-left rounded-2xl border bg-white/90 backdrop-blur p-5 transition duration-300 ease-out cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] ${selected ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-outline-variant/30'}`;
  const radioDot = (selected) => (
    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-primary' : 'border-outline-variant/60'}`}>
      {selected && <span className="apply-pop w-2.5 h-2.5 rounded-full bg-primary" />}
    </span>
  );

  const renderStep = () => {
    switch (step.key) {
      case 'destination':
        return (
          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            <label className="block">
              <span className="block text-sm font-bold text-on-surface mb-2">Your passport / residence</span>
              <select
                className={inputClass}
                value={citizenship}
                onChange={e => {
                  const c = e.target.value;
                  const dests = visaOptions.filter(o => o.citizenship === c).map(o => o.destination);
                  changeRoute({ citizenship: c, destination: dests.includes(destination) ? destination : (dests[0] || destination) });
                }}
              >
                {(citizenships.includes(citizenship) ? citizenships : [citizenship, ...citizenships]).map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-bold text-on-surface mb-2">Destination</span>
              <select className={inputClass} value={destination} onChange={e => changeRoute({ destination: e.target.value })}>
                {(destinations.includes(destination) ? destinations : [destination, ...destinations]).map(d => <option key={d}>{d}</option>)}
              </select>
            </label>
          </div>
        );

      case 'status':
        return (
          <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 ${flow.statuses.length >= 5 ? 'lg:grid-cols-5' : ''}`}>
            {flow.statuses.map((p, i) => {
              const selected = p.key === form.applicantStatus;
              return (
                <button key={p.key} type="button" onClick={() => update({ applicantStatus: p.key })} className={`${selectCard(selected)} apply-rise group flex flex-col`} style={{ '--i': i + 2 }} aria-pressed={selected}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                      <span className="material-symbols-outlined">{p.icon || 'person'}</span>
                    </span>
                    {radioDot(selected)}
                  </div>
                  <h3 className="font-headline font-bold text-lg text-on-surface leading-snug">{p.label}</h3>
                  {p.description && <p className="text-sm text-on-surface-variant mt-1">{p.description}</p>}
                </button>
              );
            })}
          </div>
        );

      case 'purpose':
        return (
          <div className={`grid gap-4 sm:grid-cols-2 ${flow.purposes.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {flow.purposes.map((p, i) => {
              const selected = p.key === form.visaCategory;
              return (
                <button key={p.key} type="button" onClick={() => update({ visaCategory: p.key })} className={`${selectCard(selected)} apply-rise group`} style={{ '--i': i + 2 }} aria-pressed={selected}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                      <span className="material-symbols-outlined">{p.icon || 'flight_takeoff'}</span>
                    </span>
                    {radioDot(selected)}
                  </div>
                  <h3 className="font-headline font-bold text-xl text-on-surface">{p.label}</h3>
                  {p.description && <p className="text-sm text-on-surface-variant mt-1">{p.description}</p>}
                  {p.points?.some(Boolean) && (
                    <ul className="mt-4 pt-4 border-t border-outline-variant/20 space-y-1.5">
                      {p.points.filter(Boolean).map(pt => (
                        <li key={pt} className="flex gap-2 text-sm text-on-surface/80">
                          <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">check</span>{pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
        );

      case 'centre':
        return (
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {flow.centres.map((c, i) => {
              const selected = c.name === form.centre;
              return (
                <button key={c.name} type="button" onClick={() => update({ centre: c.name })} className={`${selectCard(selected)} apply-rise`} style={{ '--i': i + 2 }} aria-pressed={selected}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-headline font-bold text-xl text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">location_on</span>{c.name}
                    </h3>
                    {radioDot(selected)}
                  </div>
                  {c.description && <p className="text-sm text-on-surface-variant mt-2">{c.description}</p>}
                </button>
              );
            })}
          </div>
        );

      case 'dates': {
        const days = daysUntil(form.departureDate);
        return (
          <div className="max-w-xl mx-auto space-y-10 text-center">
            <div>
              <label htmlFor="departureDate" className="block font-bold text-on-surface mb-3">Departure date</label>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <input id="departureDate" type="date" min={todayISO()} value={form.departureDate} onChange={e => update({ departureDate: e.target.value })} className={`${inputClass} sm:w-72`} />
                {days !== null && days >= 0 && (
                  <p className="text-on-surface-variant whitespace-nowrap"><span key={days} className="apply-pop inline-block text-3xl font-bold text-on-surface">{days}</span> days to prepare</p>
                )}
              </div>
            </div>
            <div>
              <p className="font-bold text-on-surface">Number of travellers</p>
              <p className="text-sm text-on-surface-variant mb-4">Everyone who needs a visa for this trip, children included.</p>
              <div className="inline-flex items-center gap-6 bg-white border border-outline-variant/30 rounded-full px-5 py-2 shadow-sm">
                <button type="button" aria-label="Fewer travellers" disabled={travellers <= 1} onClick={() => update({ travellers: travellers - 1 })} className="w-9 h-9 rounded-full hover:bg-surface-container disabled:opacity-30 cursor-pointer">−</button>
                <span key={travellers} className="apply-pop text-2xl font-bold w-6" aria-live="polite">{travellers}</span>
                <button type="button" aria-label="More travellers" disabled={travellers >= 10} onClick={() => update({ travellers: travellers + 1 })} className="w-9 h-9 rounded-full hover:bg-surface-container disabled:opacity-30 cursor-pointer">+</button>
              </div>
            </div>
          </div>
        );
      }

      case 'details':
        return (
          <div className="grid sm:grid-cols-2 gap-x-5 gap-y-5 max-w-2xl mx-auto">
            {detailFields.map(f => (
              <label key={f.id} className={`block ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                <span className="block text-sm font-bold text-on-surface mb-2">{f.label}{!f.required && <span className="font-normal text-on-surface-variant"> (optional)</span>}</span>
                {f.type === 'country' ? (
                  <select className={inputClass} value={form[f.name]} onChange={e => update({ [f.name]: e.target.value })}>
                    <option value="">Choose a nationality</option>
                    {countriesList.map(c => <option key={c}>{c}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea rows={3} className={`${inputClass} resize-none`} value={form[f.name]} onChange={e => update({ [f.name]: e.target.value })} />
                ) : f.type === 'phone' ? (
                  <div className="flex gap-2">
                    <select aria-label={`${f.label} country code`} className={`${inputClass} w-28 px-2`} value={form[f.code]} onChange={e => update({ [f.code]: e.target.value })}>
                      {countryCodes.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <input type="tel" autoComplete={f.name === 'phoneLocal' ? 'tel-national' : 'off'} className={inputClass} value={form[f.name]} onChange={e => update({ [f.name]: e.target.value })} />
                  </div>
                ) : (
                  <input
                    type={f.type || 'text'}
                    max={f.name === 'dateOfBirth' ? todayISO() : undefined}
                    min={f.name === 'passportExpiry' ? todayISO() : undefined}
                    autoComplete={{ name: 'given-name', surname: 'family-name', email: 'email', dateOfBirth: 'bday' }[f.name]}
                    className={inputClass}
                    value={form[f.name]}
                    onChange={e => update({ [f.name]: e.target.value })}
                  />
                )}
                {f.hint && <span className="block text-xs text-on-surface-variant mt-1.5">{f.hint}</span>}
              </label>
            ))}
            <p className="sm:col-span-2 text-center text-xs text-on-surface-variant">Used only for this application and handled securely.</p>
          </div>
        );

      case 'documents':
        return (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-outline-variant/30 p-6 shadow-sm">
            <DocumentUpload
              requiredDocuments={coreDocsConfig}
              onFilesChange={(files) => {
                setStepError(null);
                setCoreDocuments(files);
                setDocsUploaded(false);
              }}
            />
          </div>
        );

      case 'support':
        return (
          <div>
            <p className="text-center text-sm text-on-surface-variant -mt-4 mb-6">Prices are per traveller. Government and visa centre fees are separate.</p>
            <div className={`grid gap-5 ${flow.packages.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-3xl mx-auto'}`}>
              {flow.packages.map((p, i) => {
                const selected = p.key === form.package;
                const dark = !!p.highlight;
                return (
                  <div key={p.key} style={{ '--i': i + 2 }} className={`apply-rise rounded-3xl p-6 flex flex-col border transition duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl ${dark ? 'bg-on-surface text-white border-on-surface shadow-xl' : 'bg-white border-outline-variant/30'} ${selected ? 'ring-4 ring-primary/40' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-[0.15em] uppercase text-primary">{p.tag}</span>
                      {p.badge && <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${dark ? 'bg-white/10' : 'bg-primary/10 text-primary'}`}>{p.badge}</span>}
                    </div>
                    <h3 className="font-headline font-bold text-xl mt-3">{p.title}</h3>
                    <p className={`mt-4 pb-4 border-b ${dark ? 'border-white/10' : 'border-outline-variant/20'}`}>
                      <span className="text-4xl font-extrabold">£{parseFloat(p.price) || 0}</span>
                      <span className={`text-sm ml-1.5 ${dark ? 'text-white/60' : 'text-on-surface-variant'}`}>per traveller</span>
                    </p>
                    {parseFloat(p.pay_now_amount) > 0 && parseFloat(p.pay_now_amount) < parseFloat(p.price) && (
                      <p className={`mt-4 text-sm font-semibold rounded-xl px-3 py-2 ${dark ? 'bg-white/10 text-primary-fixed' : 'bg-primary/5 text-primary'}`}>
                        Start with just £{parseFloat(p.pay_now_amount)} today, pay the rest later
                      </p>
                    )}
                    <ul className="mt-4 space-y-2.5 flex-1">
                      {(p.points || []).filter(Boolean).map(pt => (
                        <li key={pt} className="flex gap-2 text-sm">
                          <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>{pt}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => update({ package: p.key })}
                      aria-pressed={selected}
                      className={`mt-6 w-full flex items-center justify-between font-bold rounded-full px-5 py-3 transition cursor-pointer ${dark ? 'bg-white text-on-surface hover:bg-white/90' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
                    >
                      {selected ? 'Selected' : `Choose ${p.tag ? p.tag.charAt(0) + p.tag.slice(1).toLowerCase() : p.title}`}
                      <span className="material-symbols-outlined text-lg">{selected ? 'check' : 'arrow_forward'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'pay': {
        const at = (key) => steps.findIndex(s => s.key === key);
        const rows = [
          { label: 'Trip', value: [destination, status?.label, purpose?.label, form.centre && `${form.centre} centre`].filter(Boolean).join(', '), step: [at('status'), at('purpose'), at('destination')].find(n => n >= 0) ?? -1 },
          { label: 'Travel', value: form.departureDate ? `Departs ${formatDate(form.departureDate)}, ${travellers} traveller${travellers > 1 ? 's' : ''}` : `${travellers} traveller${travellers > 1 ? 's' : ''}`, step: at('dates') },
          { label: 'Applicant', value: [fullName, form.email].filter(Boolean).join(', '), step: at('details') },
          pkg && { label: 'Support', value: pkg.title, step: at('support') }
        ].filter(Boolean);

        if (submitted) {
          return (
            <div className="max-w-lg mx-auto text-center space-y-4 py-10">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-green-600 text-5xl">check_circle</span>
              </div>
              <h3 className="text-3xl font-headline font-bold text-on-surface">Application submitted</h3>
              <p className="text-on-surface-variant">Your payment went through. Our team will review your application within 24 hours and contact you at {form.email}.</p>
            </div>
          );
        }

        return (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white rounded-2xl border border-outline-variant/30 divide-y divide-outline-variant/20">
              {rows.map(r => (
                <div key={r.label} className="flex items-start gap-4 px-5 py-4 text-sm">
                  <span className="w-20 shrink-0 text-on-surface-variant">{r.label}</span>
                  <span className="flex-1 text-on-surface font-medium break-words">{r.value || '—'}</span>
                  {r.step >= 0 && <button type="button" onClick={() => goTo(r.step)} className="text-primary font-semibold underline underline-offset-2 cursor-pointer">Change</button>}
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-center font-bold text-on-surface">How would you like to pay?</h3>
              <p className="text-center text-sm text-on-surface-variant mb-4">Same service either way. Your consultant starts work as soon as the first payment goes through.</p>
              <div className="space-y-3">
                {payOptions.map((o, i) => {
                  const selected = o.id === selectedPay.id;
                  return (
                    <button key={o.id} type="button" onClick={() => setPaymentOption(o.id)} aria-pressed={selected} style={{ '--i': i + 2 }} className={`w-full ${selectCard(selected)} apply-rise hover:translate-y-0 flex gap-3`}>
                      {radioDot(selected)}
                      <span className="flex-1">
                        <span className="flex items-center gap-2 font-bold text-on-surface">
                          {o.title}
                          {o.badge && payOptions.length > 1 && <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">{o.badge}</span>}
                        </span>
                        {o.lines.map(l => <span key={l} className="block text-sm text-on-surface-variant mt-1">{l}</span>)}
                      </span>
                      <span className="font-bold text-on-surface">{money(o.amount, curr)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-on-surface">What you pay today</h3>
                <select aria-label="Currency" value={currency} onChange={e => setCurrency(e.target.value)} className="bg-white border border-outline-variant/40 rounded-lg px-2 py-1 text-sm">
                  {Object.keys(CURRENCIES).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant/30 divide-y divide-outline-variant/20 text-sm">
                <div className="flex justify-between px-5 py-3"><span>{pkg?.title || 'Service fee'}{travellers > 1 && ` × ${travellers}`}</span><span>{money(selectedPay.amount + selectedPay.balance, curr)}</span></div>
                <div className="flex justify-between px-5 py-3 gap-4"><span>Government and visa centre fees</span><span className="text-right">Paid separately at the appointment</span></div>
                {selectedPay.balance > 0 && <div className="flex justify-between px-5 py-3"><span>Balance, after your appointment is booked</span><span>{money(selectedPay.balance, curr)}</span></div>}
                <div className="flex justify-between px-5 py-4 text-lg font-bold"><span>Due today</span><span key={selectedPay.amount + currency} className="apply-pop">{money(selectedPay.amount, curr)}</span></div>
              </div>
            </div>

            <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer ${agreementAccepted ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/30 bg-white'}`}>
              <input type="checkbox" checked={agreementAccepted} onChange={e => { setAgreementAccepted(e.target.checked); setStepError(null); }} className="mt-1 w-5 h-5 accent-primary shrink-0" />
              <span className="text-sm text-on-surface">
                I have read and accept the{' '}
                <button type="button" onClick={(e) => { e.preventDefault(); setAgreementModalOpen(true); }} className="text-primary font-semibold underline underline-offset-2 cursor-pointer">Visa Assistance Agreement</button>
                {' '}and confirm my documents and details are genuine. Visa decisions rest with the authorities.
              </span>
            </label>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ---------- layout ----------
  const prev = steps[idx - 1];
  const next = steps[idx + 1];
  const isPay = step.key === 'pay';

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">

        {/* Stepper */}
        <nav aria-label="Application steps" className="apply-rise max-w-4xl mx-auto" style={{ '--i': 1 }}>
          <ol className="flex gap-5 overflow-x-auto pb-3 sm:justify-center">
            {steps.map((s, i) => {
              const done = i < idx;
              const active = i === idx;
              const reachable = i <= reach && !submitted;
              return (
                <li key={s.key} className="shrink-0">
                  <button
                    type="button"
                    disabled={!reachable || active}
                    onClick={() => goTo(i)}
                    aria-current={active ? 'step' : undefined}
                    className="group flex items-center gap-2 text-sm disabled:cursor-default cursor-pointer"
                  >
                    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-300 ${active ? 'bg-primary text-white scale-110 shadow-md shadow-primary/30' : done ? 'bg-primary/10 text-primary' : 'border border-outline-variant/60 text-on-surface-variant'}`}>
                      {done ? <span className="apply-pop material-symbols-outlined text-sm">check</span> : i + 1}
                    </span>
                    <span className={`transition-colors duration-300 ${active ? 'font-bold text-on-surface' : done ? 'text-on-surface group-hover:text-primary' : 'text-on-surface-variant'}`}>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="h-0.5 bg-outline-variant/20 rounded-full">
            <div className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${(idx / Math.max(steps.length - 1, 1)) * 100}%` }} />
          </div>
        </nav>

        {/* Step */}
        <section key={step.key} className="mt-6 sm:mt-8">
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <h1 className="apply-rise font-headline text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface">{step.heading}</h1>
            <p className="apply-rise mt-2 text-on-surface-variant sm:text-lg" style={{ '--i': 1 }}>{step.subtitle}</p>
          </div>

          <div className="apply-rise" style={{ '--i': 2 }}>{renderStep()}</div>

          {stepError && (
            <p key={stepError} role="alert" className="apply-shake max-w-2xl mx-auto mt-6 p-3 rounded-xl bg-error/10 text-error text-sm font-semibold text-center">{stepError}</p>
          )}

          {!submitted && (
            <div className="apply-rise sticky bottom-0 z-30 mt-8 -mx-4 sm:mx-auto max-w-4xl pl-4 pr-24 py-3 sm:rounded-t-2xl bg-white/80 backdrop-blur-md border-t border-outline-variant/20 flex items-center justify-between gap-4">
              {prev ? (
                <button type="button" onClick={() => goTo(idx - 1)} disabled={!!busy} aria-label={`Back to ${prev.label}`} className="group flex items-center gap-1.5 text-on-surface-variant font-semibold hover:text-on-surface disabled:opacity-50 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
                  <span className="hidden sm:inline">{prev.label}</span>
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={isPay ? handlePay : handleNext}
                disabled={!!busy || loading}
                className="group flex items-center gap-3 bg-on-surface text-white font-bold pl-6 pr-2 py-2 rounded-full shadow-lg hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] transition duration-300 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer"
              >
                <span className="whitespace-nowrap">
                  {busy || (loading ? 'Loading...' : isPay ? `Pay ${money(selectedPay.amount, curr)} now` : <>Continue<span className="hidden sm:inline"> to {next.label.toLowerCase()}</span></>)}
                </span>
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:bg-primary">
                  {busy ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">{isPay ? 'lock' : 'arrow_forward'}</span>}
                </span>
              </button>
            </div>
          )}
        </section>
      </div>

      <TravelVisaAgreementModal
        isOpen={agreementModalOpen}
        onClose={() => setAgreementModalOpen(false)}
        clientDetails={{ ...form, fullName }}
        onAccept={() => {
          setAgreementAccepted(true);
          setStepError(null);
        }}
        isAccepted={agreementAccepted}
      />
    </div>
  );
};

export default ApplicationProgressPage;
