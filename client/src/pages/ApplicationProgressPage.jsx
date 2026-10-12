import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { visaAPI } from '../services/api';
import DocumentUpload from '../components/DocumentUpload';
import TravelVisaAgreementModal from '../components/TravelVisaAgreementModal';
import { compressImageFile } from '../utils/imageCompressor';
import { hasPayInFullOption, getPayNowPoints, getPayInFullPoints, resolvePointText } from '../utils/paymentUtils';
import {
  AGREEMENT_TITLE,
  AGREEMENT_SUBTITLE,
  AGREEMENT_VERSION,
  AGREEMENT_PREAMBLE,
  AGREEMENT_SECTIONS,
  CLIENT_DECLARATIONS,
  IMPORTANT_NOTE,
  RAW_AGREEMENT_TEXT
} from '../data/travelVisaAgreementData';

// List of phone country codes
const countryCodes = [
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+1', country: 'US/CA', flag: '🇺🇸' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+34', country: 'ES', flag: '🇪🇸' }
];

// List of countries for nationality dropdown
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

// Currencies mapping for currency selector
const CURRENCIES = {
  GBP: { symbol: '£', name: 'GBP - British Pound', rate: 1.0 },
  USD: { symbol: '$', name: 'USD - US Dollar', rate: 1.27 },
  EUR: { symbol: '€', name: 'EUR - Euro', rate: 1.18 },
  INR: { symbol: '₹', name: 'INR - Indian Rupee', rate: 108.0 }
};

const DEFAULT_FORM_FIELDS_CONFIG = {
  name: { visible: true, required: true, label: 'First Name (given name)' },
  surname: { visible: true, required: true, label: 'Last Name (surname)' },
  email: { visible: true, required: true, label: 'Email Address' },
  phoneLocal: { visible: true, required: true, label: 'Phone Number (whatsapp)' },
  alternativePhoneLocal: { visible: true, required: false, label: 'Alternative Phone Number' },
  passportNumber: { visible: true, required: true, label: 'Passport Number' },
  nationality: { visible: true, required: true, label: 'Nationality' },
  residentialAddress: { visible: true, required: true, label: 'Residential Address' },
  dateOfBirth: { visible: false, required: false, label: 'Date of Birth' },
  destinationAddress: { visible: false, required: false, label: 'Destination Details / Address' },
  accommodationAddress: { visible: false, required: false, label: 'Family/Friend or Hotel Address' }
};

const getFormFieldsConfig = (visaData) => {
  const customConfig = visaData?.form_schema?.personal_details_fields || {};
  const merged = {};

  Object.keys(DEFAULT_FORM_FIELDS_CONFIG).forEach(fieldKey => {
    const def = DEFAULT_FORM_FIELDS_CONFIG[fieldKey];
    const custom = customConfig[fieldKey];
    merged[fieldKey] = {
      visible: custom !== undefined && custom.visible !== undefined ? !!custom.visible : def.visible,
      required: custom !== undefined && custom.required !== undefined ? !!custom.required : def.required,
      label: def.label
    };
  });

  return merged;
};

const ApplicationProgressPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // State from URL search params, location state, or defaults
  const citizenship = searchParams.get('citizenship') || location.state?.citizenship || 'United Kingdom';
  const destination = searchParams.get('destination') || location.state?.destination || 'Europe (Schengen States)';
  const initialCategory = searchParams.get('category') || location.state?.selectedCategory || 'employed';
  const initialVisaCategory = searchParams.get('visaType') || location.state?.selectedVisaCategory || 'tourist';
  const initialVisaData = location.state?.visaData || null;
  const initialAppointmentDate = searchParams.get('appointmentDate') || location.state?.preferredAppointmentDate || '';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedVisaCategory, setSelectedVisaCategory] = useState(initialVisaCategory);
  const [visaData, setVisaData] = useState(initialVisaData);
  const [loading, setLoading] = useState(!initialVisaData);
  const [error, setError] = useState(null);

  // Application workflow state
  const [currentStage, setCurrentStage] = useState(1);
  const [paymentOption, setPaymentOption] = useState('partial'); // 'partial' = pay now, 'full' = pay in full
  const [selectedCurrency, setSelectedCurrency] = useState('GBP');

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    fullName: '',
    email: '',
    phoneLocal: '',
    phoneCountryCode: '+44',
    phone: '',
    alternativePhoneLocal: '',
    alternativePhoneCountryCode: '+44',
    alternativePhone: '',
    passportNumber: '',
    nationality: citizenship || '',
    residentialAddress: '',
    dateOfBirth: '',
    destinationAddress: '',
    accommodationAddress: '',
    preferredAppointmentDate: initialAppointmentDate
  });

  // Dynamic form responses
  const [dynamicFormValues, setDynamicFormValues] = useState({});

  // Core Document uploads tracking: { docName: file }
  const [coreDocuments, setCoreDocuments] = useState({});
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [applicationId, setApplicationId] = useState(null);
  const isSubmittingRef = useRef(false);

  // Payment processing state
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  // Terms & Conditions Agreement state
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [agreementError, setAgreementError] = useState(null);

  const buildAgreementPayload = () => ({
    agreed: true,
    agreedAt: new Date().toISOString(),
    clientName: formData.fullName || `${formData.name || ''} ${formData.surname || ''}`.trim() || 'Applicant',
    clientEmail: formData.email,
    clientPhone: formData.phone || formData.phoneLocal,
    clientPassport: formData.passportNumber,
    citizenship,
    destination,
    visaCategory: selectedVisaCategory,
    applicantStatus: selectedCategory,
    agreementTitle: AGREEMENT_TITLE,
    agreementSubtitle: AGREEMENT_SUBTITLE,
    agreementVersion: AGREEMENT_VERSION,
    agreementText: RAW_AGREEMENT_TEXT,
    declarationsAccepted: CLIENT_DECLARATIONS
  });

  const handleAgreementToggle = async (checked) => {
    setAgreementAccepted(checked);
    if (checked) {
      setAgreementError(null);
      if (applicationId) {
        try {
          const payload = buildAgreementPayload();
          await visaAPI.updateApplication(applicationId, {
            user_data: {
              ...formData,
              applicantStatus: selectedCategory,
              visaCategory: selectedVisaCategory,
              agreement: payload
            }
          });
        } catch (err) {
          console.warn('Could not auto-sync agreement:', err);
        }
      }
    }
  };

  useEffect(() => {
    if (!visaData) {
      fetchVisaRequirements();
    }
  }, [citizenship, destination]);

  const fetchVisaRequirements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await visaAPI.getVisaRequirements(citizenship, destination);
      setVisaData(data);
    } catch (err) {
      console.error('Error loading visa requirements:', err);
      setError(err?.message || (typeof err === 'string' ? err : 'Failed to load visa requirements'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !visaData) {
    return (
      <div className="min-h-screen bg-surface-lowest flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-on-surface-variant font-medium text-lg">Loading visa requirements...</p>
        </div>
      </div>
    );
  }

  if (error && !visaData) {
    return (
      <div className="min-h-screen bg-surface-lowest flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-outline-variant/30 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface">Failed to load details</h2>
          <p className="text-on-surface-variant text-sm">{error}</p>
          <button
            onClick={fetchVisaRequirements}
            className="bg-primary text-white font-bold px-6 py-3 rounded-full shadow-md hover:bg-primary/90 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!visaData) return null;

  const coreDocsConfig = visaData.required_documents?.[selectedVisaCategory]?.[selectedCategory]?.now || [
    { icon: "travel", name: "Passport Front and Back", description: "Valid for at least 6 months beyond intended stay." },
    { icon: "badge", name: "UK Valid Status (Online Status)", description: "Proof of current legal status or residency requirement." }
  ];

  const serviceFee = visaData?.service_fee;

  const totalAmount = typeof serviceFee === 'object' && serviceFee !== null 
    ? (serviceFee.total_amount || (serviceFee.admin_fee || 0) + (serviceFee.service_fee || 0) + (serviceFee.express_fee || 0)) 
    : parseFloat(serviceFee) || 130;

  const payNowAmount = typeof serviceFee === 'object' && serviceFee !== null && serviceFee.pay_now_amount 
    ? serviceFee.pay_now_amount 
    : totalAmount;

  const payInFullAmount = typeof serviceFee === 'object' && serviceFee !== null && serviceFee.pay_in_full_amount
    ? serviceFee.pay_in_full_amount
    : 0;

  const hasPayInFull = hasPayInFullOption(serviceFee);

  const discountAmount = hasPayInFull ? Math.max(0, totalAmount - payInFullAmount) : 0;
  const discountPercentage = (hasPayInFull && totalAmount > 0) ? Math.round((discountAmount / totalAmount) * 100) : 0;

  const payNowPoints = getPayNowPoints(serviceFee);
  const payInFullPoints = getPayInFullPoints(serviceFee);

  const curr = CURRENCIES[selectedCurrency] || CURRENCIES.GBP;
  const displayTotal = (totalAmount * curr.rate).toFixed(2);
  const displayPayNow = (payNowAmount * curr.rate).toFixed(2);
  const displayPayInFull = (payInFullAmount * curr.rate).toFixed(2);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Sync fullName
      if (name === 'name' || name === 'surname') {
        updated.fullName = `${updated.name || ''} ${updated.surname || ''}`.trim();
      }
      
      // Sync phone
      if (name === 'phoneLocal' || name === 'phoneCountryCode') {
        updated.phone = `${updated.phoneCountryCode || '+44'} ${updated.phoneLocal || ''}`.trim();
      }
      
      // Sync alternative phone
      if (name === 'alternativePhoneLocal' || name === 'alternativePhoneCountryCode') {
        updated.alternativePhone = updated.alternativePhoneLocal
          ? `${updated.alternativePhoneCountryCode || '+44'} ${updated.alternativePhoneLocal || ''}`.trim()
          : '';
      }
      
      return updated;
    });
  };

  const handleNext = async () => {
    if (loading || uploadingDocs || isSubmittingRef.current) return;

    if (currentStage === 1) {
      const fieldsConfig = getFormFieldsConfig(visaData);
      const missingFields = [];

      if (fieldsConfig.name.visible && fieldsConfig.name.required && !formData.name) missingFields.push('First Name');
      if (fieldsConfig.surname.visible && fieldsConfig.surname.required && !formData.surname) missingFields.push('Last Name');
      if (fieldsConfig.email.visible && fieldsConfig.email.required && !formData.email) missingFields.push('Email Address');
      if (fieldsConfig.phoneLocal.visible && fieldsConfig.phoneLocal.required && !formData.phoneLocal) missingFields.push('Phone Number');
      if (fieldsConfig.passportNumber.visible && fieldsConfig.passportNumber.required && !formData.passportNumber) missingFields.push('Passport Number');
      if (fieldsConfig.nationality.visible && fieldsConfig.nationality.required && !formData.nationality) missingFields.push('Nationality');
      if (fieldsConfig.residentialAddress.visible && fieldsConfig.residentialAddress.required && !formData.residentialAddress) missingFields.push('Residential Address');
      if (fieldsConfig.dateOfBirth.visible && fieldsConfig.dateOfBirth.required && !formData.dateOfBirth) missingFields.push('Date of Birth');
      if (fieldsConfig.destinationAddress.visible && fieldsConfig.destinationAddress.required && !formData.destinationAddress) missingFields.push('Destination Details');
      if (fieldsConfig.accommodationAddress.visible && fieldsConfig.accommodationAddress.required && !formData.accommodationAddress) missingFields.push('Family/Friend or Hotel Address');

      if (missingFields.length > 0) {
        alert(`Please fill in all required personal details: ${missingFields.join(', ')}.`);
        return;
      }

      try {
        isSubmittingRef.current = true;
        setLoading(true);
        const submitData = {
          configuration_id: visaData.configuration_id || 1,
          user_data: {
            ...formData,
            applicantStatus: selectedCategory,
            visaCategory: selectedVisaCategory,
            status: 'Documents Pending'
          }
        };

        if (applicationId) {
          await visaAPI.updateApplication(applicationId, submitData);
        } else {
          const response = await visaAPI.createApplication(submitData);
          if (response.applicationId) {
            setApplicationId(response.applicationId);
          }
        }
      } catch (err) {
        console.error('Error saving contact details lead:', err);
        alert('Failed to save contact details. Please try again.');
        return;
      } finally {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    }
    
    if (currentStage === 2) {
      if (Object.keys(coreDocuments).length < coreDocsConfig.length) {
        alert('Please upload all required documents before proceeding.');
        return;
      }

      if (!agreementAccepted) {
        setAgreementError('Please read and accept the Visa Assistance Agreement and declarations to continue.');
        const el = document.getElementById('stage2-agreement-section') || document.getElementById('agreement-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      setAgreementError(null);

      const agreementPayload = buildAgreementPayload();

      if (!docsUploaded) {
        try {
          isSubmittingRef.current = true;
          setUploadingDocs(true);
          setLoading(true);

          let currentAppId = applicationId;
          if (!currentAppId) {
            console.warn('applicationId missing when uploading documents, creating application now');
            const res = await visaAPI.createApplication({
              configuration_id: visaData?.configuration_id || 1,
              user_data: {
                ...formData,
                applicantStatus: selectedCategory,
                visaCategory: selectedVisaCategory,
                status: 'Payment Pending',
                agreement: agreementPayload
              }
            });
            if (res.applicationId) {
              currentAppId = res.applicationId;
              setApplicationId(currentAppId);
            }
          } else {
            // Save agreement to backend immediately
            await visaAPI.updateApplication(currentAppId, {
              user_data: {
                ...formData,
                applicantStatus: selectedCategory,
                visaCategory: selectedVisaCategory,
                agreement: agreementPayload
              }
            });
          }

          // Upload documents one by one with client-side image compression
          const docEntries = Object.entries(coreDocuments);
          for (let i = 0; i < docEntries.length; i++) {
            const [docType, rawFile] = docEntries[i];
            setUploadProgressText(`Uploading ${docType} (${i + 1}/${docEntries.length})...`);

            const fileToUpload = await compressImageFile(rawFile, { maxDimension: 2000, quality: 0.82 });
            const submitData = new FormData();
            submitData.append('documents', fileToUpload);
            submitData.append('document_types', JSON.stringify([docType.trim()]));

            await visaAPI.uploadDocuments(currentAppId, submitData);
          }

          setDocsUploaded(true);
        } catch (err) {
          console.error('Error saving documents:', err);
          const is413 = err?.status === 413 || err?.statusCode === 413 || (typeof err === 'string' && err.includes('413')) || (err?.message && err.message.includes('413'));
          if (is413) {
            alert('A document file is too large for the server. Please try re-selecting it or upload an image/document under 5MB.');
          } else {
            alert(err?.message || (typeof err === 'string' ? err : 'Failed to save uploaded documents. Please try again.'));
          }
          return;
        } finally {
          isSubmittingRef.current = false;
          setUploadingDocs(false);
          setLoading(false);
          setUploadProgressText('');
        }
      } else if (applicationId) {
        // Documents already uploaded, ensure signed agreement is synced
        try {
          await visaAPI.updateApplication(applicationId, {
            user_data: {
              ...formData,
              applicantStatus: selectedCategory,
              visaCategory: selectedVisaCategory,
              agreement: agreementPayload
            }
          });
        } catch (syncErr) {
          console.warn('Agreement sync warning:', syncErr);
        }
      }
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStage(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentStage(prev => Math.max(prev - 1, 1));
  };

  const handleRazorpayPayment = async (appId, orderData) => {
    return new Promise((resolve, reject) => {
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ZoltanVisa',
        description: 'Visa Application Service Fee',
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            const verifyData = {
              applicationId: appId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };
            await visaAPI.verifyPayment(verifyData);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: '#ff4d85'
        },
        modal: {
          ondismiss: function() {
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };

  const handleSubmit = async () => {
    if (loading || uploadingDocs || isSubmittingRef.current) return;

    if (!agreementAccepted) {
      setAgreementError('Please read and agree to the Visa Assistance Agreement before proceeding to payment.');
      const el = document.getElementById('agreement-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setAgreementError(null);

    const agreementPayload = {
      agreed: true,
      agreedAt: new Date().toISOString(),
      clientName: formData.fullName || `${formData.name || ''} ${formData.surname || ''}`.trim(),
      clientEmail: formData.email,
      clientPhone: formData.phone || formData.phoneLocal,
      clientPassport: formData.passportNumber,
      citizenship,
      destination,
      visaCategory: selectedVisaCategory,
      applicantStatus: selectedCategory,
      agreementTitle: AGREEMENT_TITLE,
      agreementSubtitle: AGREEMENT_SUBTITLE,
      agreementVersion: AGREEMENT_VERSION,
      agreementText: RAW_AGREEMENT_TEXT,
      declarationsAccepted: CLIENT_DECLARATIONS
    };

    try {
      isSubmittingRef.current = true;
      setLoading(true);
      
      let currentAppId = applicationId;
      
      if (currentAppId) {
        // Update existing application user_data with payment details and signed agreement
        await visaAPI.updateApplication(currentAppId, {
          user_data: {
            ...formData,
            applicantStatus: selectedCategory,
            visaCategory: selectedVisaCategory,
            paymentOption,
            paymentCurrency: selectedCurrency,
            paymentAmountGBP: paymentOption === 'partial' ? payNowAmount : payInFullAmount,
            agreement: agreementPayload
          }
        });
      } else {
        // Fallback: create application from scratch if applicationId is somehow missing
        console.warn('applicationId missing in handleSubmit, creating now');
        const submitData = new FormData();
        submitData.append('configuration_id', visaData.configuration_id || 1);
        submitData.append('user_data', JSON.stringify({
          ...formData,
          applicantStatus: selectedCategory,
          visaCategory: selectedVisaCategory,
          paymentOption,
          paymentCurrency: selectedCurrency,
          paymentAmountGBP: paymentOption === 'partial' ? payNowAmount : payInFullAmount,
          status: 'Payment Pending',
          agreement: agreementPayload
        }));
        
        const documentTypes = [];
        Object.entries(coreDocuments).forEach(([docType, file]) => {
          submitData.append('documents', file);
          documentTypes.push(docType);
        });
        
        if (documentTypes.length > 0) {
          submitData.append('document_types', JSON.stringify(documentTypes));
        }

        const response = await visaAPI.createApplication(submitData);
        if (response.applicationId) {
          currentAppId = response.applicationId;
          setApplicationId(currentAppId);
        }
      }

      if (currentAppId) {
        setPaymentStatus('pending');
        const orderData = await visaAPI.createPaymentOrder(currentAppId, selectedCurrency, paymentOption);

        setPaymentStatus('processing');
        
        await handleRazorpayPayment(currentAppId, orderData);
        
        setPaymentStatus('completed');
        setSubmitted(true);
      }
    } catch (err) {
      if (err.message === 'Payment cancelled by user') {
        setPaymentStatus('failed');
        alert('Payment was cancelled. Your application is saved but payment is pending.');
      } else {
        alert(err.message || 'Failed to submit application or process payment');
      }
      console.error('Error submitting application:', err);
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  const renderAgreementSection = (id = 'agreement-section') => (
    <div id={id} className="bg-surface-lowest rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm transition-all duration-300">
      <div className="bg-surface-container-lowest px-6 py-5 border-b border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
              Visa Assistance Agreement
              <span className="text-[11px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Required
              </span>
            </h3>
            <p className="text-xs text-on-surface-variant">
              Zoltan UK & Visa Assistance Services Terms & Declarations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setAgreementModalOpen(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">open_in_full</span>
            <span>Read Fullscreen</span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <p className="font-bold text-on-surface flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-sm">schedule</span>
              35 Days + 10 Days
            </p>
            <p className="text-on-surface-variant mt-1 text-[11px]">
              Standard internal timeline plus 10-day grace period.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <p className="font-bold text-on-surface flex items-center gap-1.5 text-amber-600">
              <span className="material-symbols-outlined text-sm">gavel</span>
              No Approval Guarantee
            </p>
            <p className="text-on-surface-variant mt-1 text-[11px]">
              Sole decision power rests with official authorities.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <p className="font-bold text-on-surface flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-sm">verified</span>
              Authentic Documents
            </p>
            <p className="text-on-surface-variant mt-1 text-[11px]">
              Applicant is solely responsible for genuine documents.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <p className="font-bold text-on-surface flex items-center gap-1.5 text-purple-600">
              <span className="material-symbols-outlined text-sm">payments</span>
              Third-Party Fees
            </p>
            <p className="text-on-surface-variant mt-1 text-[11px]">
              Government & embassy fees are separate from service fees.
            </p>
          </div>
        </div>

        {/* Scrollable Agreement Reader */}
        <div className="relative">
          <div className="max-h-64 overflow-y-auto pr-3 rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/30 text-xs text-on-surface/85 space-y-4 shadow-inner">
            <div className="italic text-on-surface-variant/90 border-b border-outline-variant/20 pb-3">
              {AGREEMENT_PREAMBLE}
            </div>

            {AGREEMENT_SECTIONS.map((sec) => (
              <div key={sec.id} className="space-y-1.5">
                <h4 className="font-bold text-primary text-xs">{sec.title}</h4>
                {sec.clauses.map((c, idx) => (
                  <div key={idx} className="space-y-1">
                    <p>
                      {c.number !== '7.0' && <strong className="text-on-surface mr-1">{c.number}</strong>}
                      {c.text}
                    </p>
                    {c.bullets && (
                      <ul className="list-disc list-inside pl-3 space-y-0.5 text-on-surface-variant">
                        {c.bullets.map((b, bIdx) => (
                          <li key={bIdx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Declarations list */}
            <div className="pt-3 border-t border-outline-variant/20 space-y-2">
              <h4 className="font-bold text-primary uppercase text-xs">CLIENT DECLARATION & ACCEPTANCE</h4>
              <p className="text-[11px] text-on-surface-variant font-medium">By accepting this Agreement, I confirm that:</p>
              <ul className="space-y-1 pl-1">
                {CLIENT_DECLARATIONS.map((dec, dIdx) => (
                  <li key={dIdx} className="flex items-start gap-2 text-[11px]">
                    <span className="material-symbols-outlined text-[13px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span>{dec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] text-on-surface-variant text-center pt-2 italic">
              {IMPORTANT_NOTE}
            </p>
          </div>
          <div className="text-right mt-1.5">
            <button
              type="button"
              onClick={() => setAgreementModalOpen(true)}
              className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
            >
              View complete agreement in larger window →
            </button>
          </div>
        </div>

        {/* Error Banner if user attempted without checking */}
        {agreementError && (
          <div className="p-3.5 rounded-2xl bg-error/10 border border-error/20 flex items-center gap-3 text-error text-xs font-semibold animate-in shake duration-300">
            <span className="material-symbols-outlined text-lg shrink-0">error</span>
            <span>{agreementError}</span>
          </div>
        )}

        {/* Agreement Checkbox */}
        <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${agreementAccepted ? 'border-primary/40 bg-primary/5 shadow-sm' : agreementError ? 'border-error/40 bg-error/5' : 'border-outline-variant/40 bg-white hover:border-primary/30'}`}>
          <label className="flex items-start gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreementAccepted}
              onChange={(e) => handleAgreementToggle(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer shrink-0 accent-primary"
            />
            <div className="space-y-1">
              <span className="font-bold text-sm text-on-surface block">
                I have read, understood, and voluntarily accept the Visa Assistance Agreement and Client Declaration.
              </span>
              <span className="text-xs text-on-surface-variant block leading-relaxed">
                I confirm that all documents and information provided are genuine, authentic, and accurate. I understand that Zoltan does not guarantee visa approval, and that decisions are made solely by the competent authorities.
              </span>
            </div>
          </label>
        </div>

        {/* Digital Signature & Timestamp Record */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-lowest text-[11px] text-on-surface-variant border border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">draw</span>
            <span>
              Electronic Signatory: <strong className="text-on-surface font-semibold">{formData.fullName || `${formData.name || ''} ${formData.surname || ''}`.trim() || 'Applicant'}</strong>
              {formData.passportNumber && <span> (Passport: {formData.passportNumber})</span>}
            </span>
          </div>
          <div className="font-mono text-[10px] text-outline">
            Ref: ZV-AGR-UK • {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStageContent = () => {
    switch (currentStage) {
      case 1: {
        const fieldsConfig = getFormFieldsConfig(visaData);
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 ease-out fill-mode-both">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-3 tracking-tight">Personal Details</h2>
              <p className="text-on-surface-variant/80 text-lg mb-10 max-w-xl">
                Let's start with your information for the <span className="font-semibold text-primary">{selectedCategory}</span> application to <span className="font-semibold text-primary">{destination}</span>.
              </p>
              
              <div className="space-y-8 relative z-10">
                <div className="bg-surface-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    {fieldsConfig.name.visible && (
                      <div className="group relative">
                        <input 
                          required={fieldsConfig.name.required}
                          name="name" 
                          value={formData.name || ''} 
                          onChange={handleInputChange} 
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-3 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative" 
                          placeholder="First Name" 
                          type="text" 
                        />
                        <label className={`absolute left-0 transition-all font-medium ${formData.name ? '-top-3.5 text-xs text-primary' : 'text-base text-on-surface-variant/60 top-3'} peer-placeholder-shown:text-base peer-placeholder-shown:text-on-surface-variant/60 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary`}>
                          First Name (given name) {fieldsConfig.name.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Last Name */}
                    {fieldsConfig.surname.visible && (
                      <div className="group relative">
                        <input 
                          required={fieldsConfig.surname.required}
                          name="surname" 
                          value={formData.surname || ''} 
                          onChange={handleInputChange} 
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-3 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative" 
                          placeholder="Last Name" 
                          type="text" 
                        />
                        <label className={`absolute left-0 transition-all font-medium ${formData.surname ? '-top-3.5 text-xs text-primary' : 'text-base text-on-surface-variant/60 top-3'} peer-placeholder-shown:text-base peer-placeholder-shown:text-on-surface-variant/60 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary`}>
                          Last Name (surname) {fieldsConfig.surname.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Email */}
                    {fieldsConfig.email.visible && (
                      <div className="group relative">
                        <input 
                          required={fieldsConfig.email.required}
                          name="email" 
                          value={formData.email || ''} 
                          onChange={handleInputChange} 
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-3 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative" 
                          placeholder="Email" 
                          type="email" 
                        />
                        <label className={`absolute left-0 transition-all font-medium ${formData.email ? '-top-3.5 text-xs text-primary' : 'text-base text-on-surface-variant/60 top-3'} peer-placeholder-shown:text-base peer-placeholder-shown:text-on-surface-variant/60 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary`}>
                          Email Address {fieldsConfig.email.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Phone Number */}
                    {fieldsConfig.phoneLocal.visible && (
                      <div className="group relative flex items-end">
                        <div className="absolute left-0 bottom-3 z-20 flex items-center">
                          <span className="text-on-surface-variant/60">+44</span>
                        </div>
                        <input 
                          required={fieldsConfig.phoneLocal.required}
                          name="phoneLocal" 
                          value={formData.phoneLocal || ''} 
                          onChange={handleInputChange} 
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 pl-11 pr-0 py-3 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative" 
                          placeholder="Phone Number" 
                          type="tel" 
                        />
                        <label className={`absolute transition-all font-medium ${formData.phoneLocal ? '-top-3.5 text-xs text-primary left-0' : 'text-base text-on-surface-variant/60 top-3 left-12'} peer-placeholder-shown:text-base peer-placeholder-shown:text-on-surface-variant/60 peer-placeholder-shown:top-3 peer-placeholder-shown:left-12 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary peer-focus:left-0`}>
                          Phone Number ( whatsapp ) {fieldsConfig.phoneLocal.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Alternative Phone Number */}
                    {fieldsConfig.alternativePhoneLocal.visible && (
                      <div className="group relative flex items-end">
                        <div className="absolute left-0 bottom-0 z-20 flex items-center h-[46px]">
                          <select
                            name="alternativePhoneCountryCode"
                            value={formData.alternativePhoneCountryCode || '+44'}
                            onChange={handleInputChange}
                            className="bg-transparent border-none text-on-surface focus:outline-none text-sm font-medium cursor-pointer max-w-[90px]"
                          >
                            {countryCodes.map(c => (
                              <option key={c.code} value={c.code} className="text-on-surface bg-surface-lowest">
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>
                          <span className="h-4 w-[1px] bg-outline-variant/50 mx-2" />
                        </div>

                        <input
                          name="alternativePhoneLocal"
                          value={formData.alternativePhoneLocal || ''}
                          onChange={handleInputChange}
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 pl-[110px] pr-0 py-3 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors relative z-10"
                          placeholder="Alternative Phone Number"
                          type="tel"
                        />

                        <label className={`absolute z-30 pointer-events-none transition-all duration-200 font-medium overflow-hidden text-ellipsis whitespace-nowrap
                            peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary peer-focus:left-0
                            ${formData.alternativePhoneLocal
                              ? '-top-3.5 text-xs text-primary left-0 right-0'
                              : 'top-3 text-sm text-on-surface-variant/60 left-[110px] right-0'
                            }
                          `}>
                          Alternative Phone Number {fieldsConfig.alternativePhoneLocal.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Passport Number */}
                    {fieldsConfig.passportNumber.visible && (
                      <div className="group relative">
                        <input 
                          required={fieldsConfig.passportNumber.required}
                          name="passportNumber" 
                          value={formData.passportNumber || ''} 
                          onChange={handleInputChange} 
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-3 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative" 
                          placeholder="Passport Number" 
                          type="text" 
                        />
                        <label className={`absolute left-0 transition-all font-medium ${formData.passportNumber ? '-top-3.5 text-xs text-primary' : 'text-base text-on-surface-variant/60 top-3'} peer-placeholder-shown:text-base peer-placeholder-shown:text-on-surface-variant/60 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary`}>
                          Passport Number {fieldsConfig.passportNumber.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Nationality */}
                    {fieldsConfig.nationality.visible && (
                      <div className="group relative">
                        <select 
                          required={fieldsConfig.nationality.required}
                          name="nationality" 
                          value={formData.nationality || ''} 
                          onChange={handleInputChange}
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-3 text-on-surface focus:outline-none focus:border-primary transition-colors z-10 relative appearance-none cursor-pointer text-left"
                        >
                          <option value="" disabled className="text-on-surface-variant/60">Select Nationality</option>
                          {countriesList.map(country => (
                            <option key={country} value={country} className="text-on-surface bg-surface-lowest">
                              {country}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-0 bottom-3 text-on-surface-variant/60 pointer-events-none z-20">
                          expand_more
                        </span>
                        <label className={`absolute left-0 transition-all font-medium ${formData.nationality ? '-top-3.5 text-xs text-primary' : 'text-base hidden text-on-surface-variant/60 top-3'} peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary`}>
                          Nationality {fieldsConfig.nationality.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Date of Birth */}
                    {fieldsConfig.dateOfBirth.visible && (
                      <div className="group relative">
                        <input 
                          required={fieldsConfig.dateOfBirth.required}
                          name="dateOfBirth" 
                          value={formData.dateOfBirth || ''} 
                          onChange={handleInputChange} 
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-3 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative" 
                          placeholder="Date of Birth" 
                          type="date" 
                        />
                        <label className={`absolute left-0 transition-all font-medium -top-3.5 text-xs ${formData.dateOfBirth ? 'text-primary' : 'text-on-surface-variant/60'} peer-focus:text-primary`}>
                          Date of Birth {fieldsConfig.dateOfBirth.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Residential Address */}
                    {fieldsConfig.residentialAddress.visible && (
                      <div className="group relative col-span-1 md:col-span-2">
                        <textarea 
                          required={fieldsConfig.residentialAddress.required}
                          name="residentialAddress" 
                          value={formData.residentialAddress || ''} 
                          onChange={handleInputChange} 
                          rows="3"
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-2 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative resize-none" 
                          placeholder="Residential Address" 
                        />
                        <label className={`absolute left-0 transition-all font-medium ${formData.residentialAddress ? '-top-3.5 text-xs text-primary' : 'text-base text-on-surface-variant/60 top-2'} peer-placeholder-shown:text-base peer-placeholder-shown:text-on-surface-variant/60 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary`}>
                          Residential Address (Street, City, Postcode, Country) {fieldsConfig.residentialAddress.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Destination Address / Details */}
                    {fieldsConfig.destinationAddress.visible && (
                      <div className="group relative col-span-1 md:col-span-2">
                        <input 
                          required={fieldsConfig.destinationAddress.required}
                          name="destinationAddress" 
                          value={formData.destinationAddress || ''} 
                          onChange={handleInputChange} 
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-3 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative" 
                          placeholder="Destination Details / Address" 
                          type="text" 
                        />
                        <label className={`absolute left-0 transition-all font-medium ${formData.destinationAddress ? '-top-3.5 text-xs text-primary' : 'text-base text-on-surface-variant/60 top-3'} peer-placeholder-shown:text-base peer-placeholder-shown:text-on-surface-variant/60 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary`}>
                          Travel Destination / Address in Destination Country {fieldsConfig.destinationAddress.required && '*'}
                        </label>
                      </div>
                    )}

                    {/* Family/Friend or Hotel Address */}
                    {fieldsConfig.accommodationAddress.visible && (
                      <div className="group relative col-span-1 md:col-span-2">
                        <textarea 
                          required={fieldsConfig.accommodationAddress.required}
                          name="accommodationAddress" 
                          value={formData.accommodationAddress || ''} 
                          onChange={handleInputChange} 
                          rows="3"
                          className="peer w-full bg-transparent border-b-2 border-outline-variant/50 px-0 py-2 text-on-surface placeholder-transparent focus:outline-none focus:border-primary transition-colors z-10 relative resize-none" 
                          placeholder="Family/Friend or Hotel Address" 
                        />
                        <label className={`absolute left-0 transition-all font-medium ${formData.accommodationAddress ? '-top-3.5 text-xs text-primary' : 'text-base text-on-surface-variant/60 top-2'} peer-placeholder-shown:text-base peer-placeholder-shown:text-on-surface-variant/60 peer-placeholder-shown:top-2 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary`}>
                          Family/Friend or Hotel Address {fieldsConfig.accommodationAddress.required && '*'}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleNext} 
                disabled={loading || uploadingDocs}
                className={`group bg-on-surface text-surface-lowest font-bold px-8 py-4 rounded-full shadow-[0_4px_14px_0_rgb(0,0,0,0.2)] flex items-center gap-3 transition-all duration-300 text-white ${
                  loading || uploadingDocs 
                    ? 'opacity-60 cursor-not-allowed pointer-events-none' 
                    : 'hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                    <span>Saving Details...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Documents</span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
      }
      
      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 ease-out fill-mode-both">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-3 tracking-tight">Required Documents & Service Agreement</h2>
              <p className="text-on-surface-variant/80 text-lg mb-10 max-w-xl">
                Please upload your required documents and accept the Visa Assistance Agreement before proceeding to payment.
              </p>
            
              <div className="bg-surface-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm relative z-10">
                <DocumentUpload
                  requiredDocuments={coreDocsConfig}
                  onFilesChange={(files) => {
                    setCoreDocuments(files);
                    setDocsUploaded(false);
                  }}
                  existingFiles={coreDocuments}
                />
              </div>
            </div>

            {/* Travel & Visa Assistance Agreement on Stage 2 */}
            {renderAgreementSection('stage2-agreement-section')}

            <div className="flex justify-between items-center pt-4">
              <button 
                onClick={handleBack} 
                disabled={loading || uploadingDocs}
                className="group text-on-surface-variant font-bold px-6 py-4 rounded-full hover:bg-surface-container flex items-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span> 
                Back
              </button>
              <button 
                onClick={handleNext} 
                disabled={loading || uploadingDocs}
                className={`group bg-on-surface text-surface-lowest font-bold px-8 py-4 rounded-full shadow-[0_4px_14px_0_rgb(0,0,0,0.2)] flex items-center gap-3 transition-all duration-300 text-white ${
                  loading || uploadingDocs 
                    ? 'opacity-60 cursor-not-allowed pointer-events-none' 
                    : 'hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5'
                }`}
              >
                {uploadingDocs ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                    <span>{uploadProgressText || 'Uploading Documents...'}</span>
                  </>
                ) : loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Review & Payment</span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 ease-out fill-mode-both">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              
              <h2 className="font-headline text-4xl font-extrabold text-on-surface mb-3 tracking-tight relative z-10">Final Review & Payment</h2>
              <p className="text-on-surface-variant/80 text-lg mb-10 max-w-xl relative z-10">
                Select your payment option to proceed.
              </p>

            {submitted ? (
              <div className="py-16 text-center space-y-6 relative z-10 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
                </div>
                <div>
                  <h3 className="text-3xl font-headline font-bold text-on-surface mb-2">Application Submitted!</h3>
                  <p className="text-on-surface-variant text-lg">Your payment was successful and your documents are under review.</p>
                </div>
                <div className="inline-block bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 mt-8 shadow-sm">
                   <p className="text-sm text-on-surface font-semibold mb-1">What happens next?</p>
                   <p className="text-xs text-on-surface-variant">Our team will verify your documents within 24 hours and contact you to collect the remaining documents.</p>
                </div>
              </div>
            ) : paymentStatus === 'processing' ? (
              <div className="py-24 text-center space-y-6 relative z-10">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-bold text-on-surface mb-2">Processing Secure Payment</h3>
                  <p className="text-on-surface-variant">Please complete the payment in the secure Razorpay window...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-10 relative z-10">
                {/* Currency Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-surface-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-sm gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">payments</span>
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-base text-on-surface">Payment Currency</h4>
                      <p className="text-xs text-on-surface-variant/80">Choose your preferred currency to make the payment</p>
                    </div>
                  </div>
                  <div className="relative shrink-0 w-full sm:w-60">
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="w-full bg-surface-container-low text-on-surface font-semibold text-sm rounded-xl py-3 pl-4 pr-10 border-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
                    >
                      {Object.entries(CURRENCIES).map(([code, details]) => (
                        <option key={code} value={code} className="text-on-surface bg-surface-lowest">
                          {details.symbol} {details.name}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Payment Options Selection */}
                <div className={`grid grid-cols-1 ${hasPayInFull ? 'md:grid-cols-2 max-w-4xl' : 'max-w-xl'} gap-6 mx-auto w-full`}>
                  {/* Pay Now */}
                  <div 
                    onClick={() => setPaymentOption('partial')}
                    className={`cursor-pointer rounded-2xl p-6 border-2 transition-all ${paymentOption === 'partial' ? 'border-secondary bg-secondary/5 shadow-md scale-[1.01]' : 'border-outline-variant/30 bg-white hover:border-secondary/50'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined">payments</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentOption === 'partial' ? 'border-secondary bg-secondary' : 'border-outline-variant/50'}`}>
                        {paymentOption === 'partial' && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg text-on-surface mb-1">Pay Now</h3>
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-on-surface">{curr.symbol}{displayPayNow}</span>
                      <span className="text-sm text-on-surface-variant"> today</span>
                    </div>
                    <div className="text-sm text-on-surface-variant space-y-2">
                      {payNowPoints.map((pt, idx) => (
                        <p key={idx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5">check_circle</span>
                          <span>{resolvePointText(pt, displayPayNow, curr.symbol)}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Pay in Full - Render only if configured */}
                  {hasPayInFull && (
                    <div 
                      onClick={() => setPaymentOption('full')}
                      className={`cursor-pointer rounded-2xl p-6 border-2 transition-all relative overflow-hidden ${paymentOption === 'full' ? 'border-primary bg-primary/5 shadow-md scale-[1.01]' : 'border-outline-variant/30 bg-white hover:border-primary/50'}`}
                    >
                      <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        {discountPercentage}% Discount
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center">
                          <span className="material-symbols-outlined">workspace_premium</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentOption === 'full' ? 'border-primary bg-primary' : 'border-outline-variant/50'}`}>
                          {paymentOption === 'full' && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-on-surface mb-1">Pay in Full</h3>
                      <div className="mb-4 flex items-end gap-2">
                        <span className="text-sm text-on-surface-variant line-through mb-1">{curr.symbol}{displayTotal}</span>
                        <span className="text-3xl font-bold text-primary">{curr.symbol}{displayPayInFull}</span>
                      </div>
                      <div className="text-sm text-on-surface-variant space-y-2">
                        {payInFullPoints.map((pt, idx) => (
                          <p key={idx} className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">check_circle</span>
                            <span>{resolvePointText(pt, displayPayInFull, curr.symbol)}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Personal Details Summary */}
                <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
                  <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant/30">
                    <h3 className="font-headline font-bold text-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">person</span>
                      Applicant Details
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Category</p>
                      <p className="font-medium capitalize">{selectedCategory} / {selectedVisaCategory}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Full Name</p>
                      <p className="font-medium">{formData.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Email</p>
                      <p className="font-medium">{formData.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1">Passport</p>
                      <p className="font-medium">{formData.passportNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Documents Summary */}
                <div className="bg-surface-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
                  <div className="bg-surface-container-lowest px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center">
                    <h3 className="font-headline font-bold text-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary">folder_open</span>
                      Uploaded Documents
                    </h3>
                  </div>
                  <div className="p-6 space-y-3">
                    {Object.entries(coreDocuments).map(([key, file]) => (
                      <div key={key} className="flex items-center justify-between p-3 hover:bg-surface-container-lowest rounded-xl transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined">
                              {file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf') 
                                ? 'picture_as_pdf' 
                                : (file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name || '')) 
                                ? 'image' 
                                : 'description'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-on-surface">{key}</h4>
                            <p className="text-xs text-on-surface-variant mt-0.5 truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-on-surface-variant/60 group-hover:text-on-surface-variant transition-colors">
                          {(file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    ))}
                    {formData.accommodationAddress && (
                      <div className="flex items-center justify-between p-3 hover:bg-surface-container-lowest rounded-xl transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined">home</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-on-surface">Accommodation</h4>
                            <p className="text-xs text-on-surface-variant mt-0.5">{formData.accommodationAddress}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Travel & Visa Assistance Agreement Status / Section */}
                {agreementAccepted ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                        <span className="material-symbols-outlined text-2xl">verified</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                          Visa Assistance Agreement Accepted
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Signed
                          </span>
                        </h4>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Electronically signed by <strong>{formData.fullName || `${formData.name || ''} ${formData.surname || ''}`.trim() || 'Applicant'}</strong>
                          {formData.passportNumber ? ` (Passport: ${formData.passportNumber})` : ''} • Ref: ZV-AGR-UK
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAgreementModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-white border border-emerald-500/30 text-emerald-700 font-semibold text-xs hover:bg-emerald-50 transition-colors shadow-sm self-start sm:self-auto flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      View Signed Agreement Copy
                    </button>
                  </div>
                ) : (
                  renderAgreementSection('stage3-agreement-section')
                )}
              </div>
            )}
            </div>

            {!submitted && paymentStatus !== 'processing' && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
                <button 
                  onClick={handleBack} 
                  disabled={loading || uploadingDocs}
                  className="group text-on-surface-variant font-bold px-6 py-4 rounded-full hover:bg-surface-container flex items-center gap-2 transition-all duration-300 w-full md:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span> 
                  Back to Documents
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || uploadingDocs || paymentStatus === 'processing'}
                  className="group relative overflow-hidden bg-gradient-to-r from-[#ff4d85] to-[#ff758c] text-white font-bold px-12 py-4 rounded-full shadow-[0_8px_25px_rgba(255,77,133,0.3)] hover:shadow-[0_12px_35px_rgba(255,77,133,0.4)] hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-3 transition-all duration-300 w-full md:w-auto cursor-pointer disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-full" />
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay {curr.symbol}{paymentOption === 'partial' ? displayPayNow : displayPayInFull} & Submit</span>
                        <span className="material-symbols-outlined text-sm">lock</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const steps = [
    { num: 1, title: 'Personal Details', desc: 'Basic information' },
    { num: 2, title: 'Documents & Agreement', desc: 'Uploads & Service Terms' },
    { num: 3, title: 'Review & Payment', desc: 'Select option & Pay' }
  ];

  return (
    <div className="min-h-screen bg-surface-lowest relative font-sans">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-12 relative z-10">
        {/* Modern Sidebar */}
        <div className="w-full lg:w-[340px] flex-shrink-0">
          <div className="sticky top-24 bg-white/60 backdrop-blur-2xl border border-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h1 className="font-headline text-2xl font-extrabold mb-8 text-on-surface tracking-tight">Application Progress</h1>
            
            <div className="relative">
              {/* Vertical tracking line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-outline-variant/20 -z-10 rounded-full" />
              
              <div className="space-y-8">
                {steps.map((step, idx) => {
                  const isCompleted = currentStage > step.num;
                  const isActive = currentStage === step.num;
                  
                  return (
                    <div key={step.num} className="flex gap-5 relative group">
                      {/* Step Indicator */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-500 ease-out z-10 relative
                          ${isCompleted ? 'bg-primary text-white shadow-primary/20' : 
                            isActive ? 'bg-surface-lowest text-primary border-2 border-primary shadow-lg shadow-primary/10 scale-110' : 
                            'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'}`}
                        >
                          {isCompleted ? <span className="material-symbols-outlined text-lg">check</span> : step.num}
                        </div>
                        {/* Active Glow */}
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md scale-150 animate-pulse -z-10" />
                        )}
                      </div>
                      
                      {/* Step Content */}
                      <div className={`pt-2 transition-all duration-300 ${isActive ? 'translate-x-1' : ''}`}>
                        <h3 className={`font-headline font-bold text-[15px] transition-colors duration-300 ${isActive ? 'text-on-surface' : isCompleted ? 'text-on-surface-variant' : 'text-on-surface-variant/60'}`}>
                          {step.title}
                        </h3>
                        <p className={`text-xs mt-1 transition-colors duration-300 ${isActive ? 'text-primary font-medium' : isCompleted ? 'text-primary/70' : 'text-outline'}`}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-4xl mt-12">
          {renderStageContent()}
        </div>
      </div>

      {/* Fullscreen Agreement Reader Modal */}
      <TravelVisaAgreementModal
        isOpen={agreementModalOpen}
        onClose={() => setAgreementModalOpen(false)}
        clientDetails={formData}
        onAccept={() => {
          setAgreementAccepted(true);
          setAgreementError(null);
        }}
        isAccepted={agreementAccepted}
      />
    </div>
  );
};

export default ApplicationProgressPage;
