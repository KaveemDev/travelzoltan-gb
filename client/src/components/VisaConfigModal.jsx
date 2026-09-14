import React, { useState, useEffect, useRef } from 'react';
import { 
  DEFAULT_PAY_NOW_POINTS, 
  DEFAULT_PAY_IN_FULL_POINTS, 
  DEFAULT_WHATS_INCLUDED_POINTS,
  resolvePointText
} from '../utils/paymentUtils';

import { DOCUMENT_ICONS, DEFAULT_PERSONAL_DETAILS_FIELDS } from '../constants/visaConfig';

// Helper to format currency
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '£0.00';
  return `£${parseFloat(amount).toFixed(2)}`;
};

// Calculate total fee from breakdown
const calculateTotalFee = (serviceFee) => {
  if (typeof serviceFee === 'object' && serviceFee !== null) {
    return serviceFee.total_amount || (serviceFee.admin_fee || 0) + (serviceFee.service_fee || 0) + (serviceFee.express_fee || 0);
  }
  return parseFloat(serviceFee) || 0;
};

// Modern Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, disabled = false, label, id }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    id={id}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/40 ${
      disabled ? 'opacity-40 cursor-not-allowed bg-surface-container-high' : checked ? 'bg-primary' : 'bg-outline/30 hover:bg-outline/50'
    }`}
  >
    <span className="sr-only">{label}</span>
    <span
      aria-hidden="true"
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const VisaConfigModal = ({
  isOpen,
  onClose,
  onSave,
  editingConfig,
  configForm,
  setConfigForm,
  saving = false
}) => {
  const [activeTab, setActiveTab] = useState('route'); // 'route', 'commercials', 'schema', 'documents'
  const [activeVisaCategory, setActiveVisaCategory] = useState('tourist');
  const [activeApplicantCategory, setActiveApplicantCategory] = useState('employed');
  const [activeDocsCategory, setActiveDocsCategory] = useState('now');
  const [newDoc, setNewDoc] = useState({ name: '', description: '', icon: 'description', type: 'text' });
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const bodyRef = useRef(null);

  // Reset tab and scroll on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('route');
    }
  }, [isOpen]);

  // Scroll to top on tab switch
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  // Commercials update helper
  const updateFeeBreakdown = (field, value) => {
    let newValue = value;
    if (field === 'total_amount' || field === 'pay_now_amount' || field === 'pay_in_full_amount') {
      newValue = parseFloat(value) || 0;
    }
    setConfigForm(prev => ({
      ...prev,
      service_fee: {
        ...prev.service_fee,
        [field]: newValue
      }
    }));
  };

  // Form schema update helper
  const updateFormFieldConfig = (fieldId, key, value) => {
    setConfigForm(prev => {
      const currentSchema = prev.form_schema || { personal_details_fields: {} };
      const currentField = currentSchema.personal_details_fields?.[fieldId] || {};
      const updatedFields = {
        ...currentSchema.personal_details_fields,
        [fieldId]: {
          ...currentField,
          [key]: value
        }
      };
      return {
        ...prev,
        form_schema: {
          ...currentSchema,
          personal_details_fields: updatedFields
        }
      };
    });
  };

  // Required documents array helper
  const getActiveDocArray = () => {
    if (configForm.required_documents?.[activeVisaCategory]?.[activeApplicantCategory]) {
      return configForm.required_documents[activeVisaCategory][activeApplicantCategory][activeDocsCategory] || [];
    }
    return [];
  };

  // Document counter helper for badges
  const getCategoryDocCount = (visaCat, appCat, phase = null) => {
    const docs = configForm.required_documents;
    if (!docs || !docs[visaCat]) return 0;
    
    if (appCat) {
      if (!docs[visaCat][appCat]) return 0;
      if (phase) {
        return Array.isArray(docs[visaCat][appCat][phase]) ? docs[visaCat][appCat][phase].length : 0;
      }
      const now = Array.isArray(docs[visaCat][appCat].now) ? docs[visaCat][appCat].now.length : 0;
      const later = Array.isArray(docs[visaCat][appCat].later) ? docs[visaCat][appCat].later.length : 0;
      const query = Array.isArray(docs[visaCat][appCat].query) ? docs[visaCat][appCat].query.length : 0;
      return now + later + query;
    }

    let count = 0;
    ['student', 'employed', 'self_employed', 'unemployed'].forEach(cat => {
      if (docs[visaCat][cat]) {
        count += (docs[visaCat][cat].now?.length || 0) + (docs[visaCat][cat].later?.length || 0) + (docs[visaCat][cat].query?.length || 0);
      }
    });
    return count;
  };

  // Add Document / Question
  const addDocument = () => {
    if (!newDoc.name.trim()) return;

    const updatedDocs = JSON.parse(JSON.stringify(configForm.required_documents || {}));
    
    if (!updatedDocs[activeVisaCategory]) {
      updatedDocs[activeVisaCategory] = {};
    }
    if (!updatedDocs[activeVisaCategory][activeApplicantCategory]) {
      updatedDocs[activeVisaCategory][activeApplicantCategory] = { now: [], later: [], query: [] };
    }
    if (!updatedDocs[activeVisaCategory][activeApplicantCategory][activeDocsCategory]) {
      updatedDocs[activeVisaCategory][activeApplicantCategory][activeDocsCategory] = [];
    }
    
    updatedDocs[activeVisaCategory][activeApplicantCategory][activeDocsCategory].push({ ...newDoc });
    
    setConfigForm({ ...configForm, required_documents: updatedDocs });
    setNewDoc({ name: '', description: '', icon: 'description', type: 'text' });
    setIconPickerOpen(false);
  };

  // Remove Document / Question
  const removeDocument = (idx) => {
    const updatedDocs = JSON.parse(JSON.stringify(configForm.required_documents || {}));
    if (updatedDocs[activeVisaCategory]?.[activeApplicantCategory]?.[activeDocsCategory]) {
      updatedDocs[activeVisaCategory][activeApplicantCategory][activeDocsCategory].splice(idx, 1);
    }
    setConfigForm({ ...configForm, required_documents: updatedDocs });
  };

  // Calculations for preview
  const totalFee = calculateTotalFee(configForm.service_fee);
  const payNowAmt = configForm.service_fee?.pay_now_amount || 0;
  const payInFullAmt = configForm.service_fee?.pay_in_full_amount || 0;
  const hasDiscount = payInFullAmt > 0 && payInFullAmt < totalFee;
  const discountPercent = hasDiscount ? Math.round(((totalFee - payInFullAmt) / totalFee) * 100) : 0;

  // Active form fields count
  const activeFieldsCount = DEFAULT_PERSONAL_DETAILS_FIELDS.filter(field => {
    const fieldConf = configForm.form_schema?.personal_details_fields?.[field.id];
    return fieldConf ? fieldConf.visible !== false : field.defaultVisible;
  }).length;

  // Total docs across all categories
  let totalDocsOverall = 0;
  if (configForm.required_documents) {
    ['tourist', 'visiting', 'business'].forEach(vk => {
      totalDocsOverall += getCategoryDocCount(vk);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Dialog Card */}
      <div 
        className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-on-surface transition-all transform animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="relative px-6 py-5 border-b border-surface-container-high bg-gradient-to-r from-surface-container-lowest via-surface-container-low to-surface-container-lowest flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-md shadow-primary/20 text-white shrink-0">
              <span className="material-symbols-outlined text-2xl">
                {editingConfig ? 'edit_note' : 'add_road'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  {editingConfig ? 'Edit Visa Configuration' : 'Create New Visa Route'}
                </h3>
                {editingConfig ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    ID #{editingConfig.id}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    New Configuration
                  </span>
                )}
              </div>
              <p className="text-xs text-outline mt-0.5 flex items-center gap-1.5">
                {configForm.citizenship && configForm.destination ? (
                  <span className="font-medium text-on-surface flex items-center gap-1">
                    <span>{configForm.citizenship}</span>
                    <span className="material-symbols-outlined text-xs text-primary">arrow_forward</span>
                    <span className="text-primary font-bold">{configForm.destination}</span>
                  </span>
                ) : (
                  'Define citizenship route, pricing structure, dynamic questions, and required applicant dossiers'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="Close dialog (Esc)"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-6 border-b border-surface-container-high bg-surface-container-low/60 overflow-x-auto no-scrollbar shrink-0">
          <nav className="flex space-x-1 sm:space-x-2 py-2">
            {[
              { 
                id: 'route', 
                label: 'Route Details', 
                icon: 'public', 
                badge: configForm.citizenship && configForm.destination ? 'Ready' : 'Required' 
              },
              { 
                id: 'commercials', 
                label: 'Commercials & Pricing', 
                icon: 'payments', 
                badge: formatCurrency(totalFee) 
              },
              { 
                id: 'schema', 
                label: 'Form Schema', 
                icon: 'fact_check', 
                badge: `${activeFieldsCount}/${DEFAULT_PERSONAL_DETAILS_FIELDS.length}` 
              },
              { 
                id: 'documents', 
                label: 'Required Documents', 
                icon: 'folder_managed', 
                badge: totalDocsOverall > 0 ? `${totalDocsOverall} items` : null 
              }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`modal-tab-${tab.id}`}
                  data-modal-tab={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                      : 'text-outline hover:text-on-surface hover:bg-surface-container-high/80'
                  }`}
                >
                  <span className={`material-symbols-outlined text-base ${isActive ? 'text-white' : 'text-outline'}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      isActive 
                        ? 'bg-white/25 text-white' 
                        : 'bg-surface-container-high text-outline'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">

          {/* TAB 1: ROUTE DETAILS */}
          {activeTab === 'route' && (
            <div className="space-y-6 max-w-3xl mx-auto py-2">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border border-primary/15 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">explore</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">Route Definition</h4>
                    <p className="text-xs text-outline">
                      Specify the citizenship nationality and destination country this configuration applies to.
                    </p>
                  </div>
                </div>
                {editingConfig && (
                  <span className="text-xs px-3 py-1 rounded-lg bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20 flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    Locked for Edits
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Citizenship Input */}
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary">person_pin_circle</span>
                      Origin / Citizenship
                    </label>
                    {editingConfig && (
                      <span className="text-[10px] text-outline italic">Protected</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={configForm.citizenship}
                    onChange={(e) => setConfigForm({ ...configForm, citizenship: e.target.value })}
                    disabled={!!editingConfig}
                    placeholder="e.g., United Kingdom, India, USA..."
                    className="w-full px-4 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] text-outline">
                    The passport / residency country the applicant holds.
                  </p>
                </div>

                {/* Destination Input */}
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-secondary">flight_takeoff</span>
                      Destination Country / Territory
                    </label>
                    {editingConfig && (
                      <span className="text-[10px] text-outline italic">Protected</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={configForm.destination}
                    onChange={(e) => setConfigForm({ ...configForm, destination: e.target.value })}
                    disabled={!!editingConfig}
                    placeholder="e.g., Schengen (Europe), United Kingdom, Dubai..."
                    className="w-full px-4 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[11px] text-outline">
                    The target territory for visa application issuance.
                  </p>
                </div>
              </div>

              {/* Visual Route Preview Card */}
              {configForm.citizenship && configForm.destination && (
                <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-widest">
                    Customer Route Preview
                  </span>
                  <div className="flex items-center gap-3 sm:gap-6 text-base sm:text-lg font-bold text-on-surface">
                    <span className="px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">home</span>
                      {configForm.citizenship}
                    </span>
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-primary text-xl">flight</span>
                      <span className="w-12 h-0.5 bg-gradient-to-r from-primary to-secondary"></span>
                    </div>
                    <span className="px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-2 text-secondary font-bold">
                      <span className="material-symbols-outlined text-secondary text-sm">flag</span>
                      {configForm.destination}
                    </span>
                  </div>
                </div>
              )}

              {editingConfig && (
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-3 text-xs text-outline">
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">info</span>
                  <p>
                    <strong>Note:</strong> Citizenship and Destination cannot be altered after route creation to maintain integrity with existing applicants. To modify a route name, use <strong>Duplicate</strong> on the table to create a fresh copy.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMMERCIALS & PRICING */}
          {activeTab === 'commercials' && (
            <div className="space-y-6">
              {/* Fee Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Fee Card */}
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">
                      Total Service Fee (£)
                    </label>
                    <span className="material-symbols-outlined text-primary text-lg">receipt_long</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-outline">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={configForm.service_fee?.total_amount ?? 0}
                      onChange={(e) => updateFeeBreakdown('total_amount', e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-base font-bold transition-all"
                      placeholder="130.00"
                    />
                  </div>
                  <p className="text-[11px] text-outline">
                    Standard full fee of the concierge service package.
                  </p>
                </div>

                {/* Pay Now Fee Card */}
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">
                      Pay Now Deposit (£)
                    </label>
                    <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-outline">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={configForm.service_fee?.pay_now_amount ?? 0}
                      onChange={(e) => updateFeeBreakdown('pay_now_amount', e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-base font-bold transition-all text-emerald-600"
                      placeholder="65.00"
                    />
                  </div>
                  <p className="text-[11px] text-outline">
                    Initial amount charged today to start the dossier process.
                  </p>
                </div>

                {/* Pay in Full Discounted Card */}
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                      Pay in Full (£)
                      {hasDiscount && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Save {discountPercent}%
                        </span>
                      )}
                    </label>
                    <span className="material-symbols-outlined text-secondary text-lg">savings</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-outline">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={configForm.service_fee?.pay_in_full_amount ?? 0}
                      onChange={(e) => updateFeeBreakdown('pay_in_full_amount', e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-base font-bold transition-all text-secondary"
                      placeholder="91.00"
                    />
                  </div>
                  <p className="text-[11px] text-outline">
                    Discounted rate. Set to 0 to offer only deposit option.
                  </p>
                </div>
              </div>

              {/* Customer Live Preview on Checkout */}
              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">visibility</span>
                    <h4 className="font-bold text-sm text-on-surface">Client Checklist Payment Option Preview</h4>
                  </div>
                  <span className="text-xs text-outline">Live dynamic preview</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pay Part Card Preview */}
                  <div className="p-4 rounded-xl border-2 border-primary/40 bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase">Option 1: Pay Part Now</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(payNowAmt)}</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-on-surface-variant">
                      {(configForm.service_fee?.pay_now_points || DEFAULT_PAY_NOW_POINTS).map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-primary text-sm shrink-0">check_circle</span>
                          <span>{resolvePointText(pt, payNowAmt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pay in Full Card Preview */}
                  <div className={`p-4 rounded-xl border-2 space-y-2 ${
                    payInFullAmt > 0 ? 'border-secondary/40 bg-secondary/5' : 'border-dashed border-outline-variant/40 bg-surface-container-low opacity-60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-secondary uppercase">
                        Option 2: Pay in Full {hasDiscount && `(Save ${discountPercent}%)`}
                      </span>
                      <span className="text-lg font-bold text-secondary">
                        {payInFullAmt > 0 ? formatCurrency(payInFullAmt) : 'Disabled (0.00)'}
                      </span>
                    </div>
                    {payInFullAmt > 0 ? (
                      <ul className="space-y-1.5 text-xs text-on-surface-variant">
                        {(configForm.service_fee?.pay_in_full_points || DEFAULT_PAY_IN_FULL_POINTS).map((pt, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="material-symbols-outlined text-secondary text-sm shrink-0">check_circle</span>
                            <span>{resolvePointText(pt, payInFullAmt)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-outline italic">
                        Not shown to clients because amount is £0.00.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bullet Points Customization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Pay Now Points */}
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary">format_list_bulleted</span>
                      Pay Now Feature Points (One per line)
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold">
                      &#123;amount&#125; token
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={Array.isArray(configForm.service_fee?.pay_now_points) ? configForm.service_fee.pay_now_points.join('\n') : ''}
                    onChange={(e) => updateFeeBreakdown('pay_now_points', e.target.value.split('\n'))}
                    className="w-full px-3.5 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs font-mono leading-relaxed"
                    placeholder="£{amount} due today to start process&#10;Remaining amount paid upon call with executive&#10;Premium concierge service included"
                  />
                  <p className="text-[11px] text-outline">
                    Use <code className="bg-surface-container-high px-1 rounded text-primary">&#123;amount&#125;</code> to dynamically inject the Pay Now price.
                  </p>
                </div>

                {/* Pay in Full Points */}
                <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-secondary">format_list_bulleted</span>
                      Pay in Full Feature Points (One per line)
                    </label>
                    <button
                      type="button"
                      onClick={() => updateFeeBreakdown('pay_in_full_points', [...DEFAULT_PAY_IN_FULL_POINTS])}
                      className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Reset Default
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={Array.isArray(configForm.service_fee?.pay_in_full_points) ? configForm.service_fee.pay_in_full_points.join('\n') : ''}
                    onChange={(e) => updateFeeBreakdown('pay_in_full_points', e.target.value.split('\n'))}
                    className="w-full px-3.5 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-secondary focus:ring-2 focus:ring-secondary/20 text-xs font-mono leading-relaxed"
                    placeholder={DEFAULT_PAY_IN_FULL_POINTS.join('\n')}
                  />
                  <p className="text-[11px] text-outline">
                    Features highlighted when client opts for the upfront discounted fee.
                  </p>
                </div>
              </div>

              {/* What's Included */}
              <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">verified</span>
                    "What's Included in Your Service" Deliverables (One per line)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateFeeBreakdown('whats_included', [...DEFAULT_WHATS_INCLUDED_POINTS])}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">restart_alt</span>
                    Reset to Defaults
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={Array.isArray(configForm.service_fee?.whats_included) ? configForm.service_fee.whats_included.join('\n') : ''}
                  onChange={(e) => updateFeeBreakdown('whats_included', e.target.value.split('\n'))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs font-mono leading-relaxed"
                  placeholder={DEFAULT_WHATS_INCLUDED_POINTS.join('\n')}
                />
                <p className="text-[11px] text-outline">
                  These points are presented in the concierge trust badge on the applicant checklist page.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: FORM SCHEMA */}
          {activeTab === 'schema' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-on-surface">Personal Details Form Controls</h4>
                  <p className="text-xs text-outline mt-0.5">
                    Configure which fields are displayed on the applicant's intake form for this specific visa route.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {activeFieldsCount} Active
                  </span>
                  <span className="text-outline">/</span>
                  <span className="text-outline">
                    {DEFAULT_PERSONAL_DETAILS_FIELDS.length} Total Fields
                  </span>
                </div>
              </div>

              {/* Grid of Fields with Modern Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFAULT_PERSONAL_DETAILS_FIELDS.map(field => {
                  const currentConfig = configForm.form_schema?.personal_details_fields?.[field.id] || {
                    visible: field.defaultVisible,
                    required: field.defaultRequired
                  };
                  const isVisible = currentConfig.visible !== false;
                  const isRequired = !!currentConfig.required;

                  return (
                    <div 
                      key={field.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isVisible
                          ? 'bg-surface-container-lowest border-outline-variant/40 shadow-sm'
                          : 'bg-surface-container-low/60 border-outline-variant/20 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isVisible ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-outline'
                          }`}>
                            <span className="material-symbols-outlined text-lg">{field.icon}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-on-surface">{field.label}</span>
                              {isRequired && isVisible && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                  Required
                                </span>
                              )}
                              {!isVisible && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-outline/10 text-outline">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-outline mt-0.5">{field.desc}</p>
                          </div>
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between pt-3 border-t border-surface-container-high text-xs">
                        {/* Show Field Toggle */}
                        <div className="flex items-center gap-2">
                          <ToggleSwitch
                            id={`toggle-vis-${field.id}`}
                            label={`Show ${field.label}`}
                            checked={isVisible}
                            onChange={(val) => updateFormFieldConfig(field.id, 'visible', val)}
                          />
                          <span className={`font-semibold select-none ${isVisible ? 'text-on-surface' : 'text-outline'}`}>
                            {isVisible ? 'Field Visible' : 'Hidden'}
                          </span>
                        </div>

                        {/* Required Toggle */}
                        {isVisible ? (
                          <div className="flex items-center gap-2">
                            <ToggleSwitch
                              id={`toggle-req-${field.id}`}
                              label={`Require ${field.label}`}
                              checked={isRequired}
                              onChange={(val) => updateFormFieldConfig(field.id, 'required', val)}
                            />
                            <span className={`font-semibold select-none ${isRequired ? 'text-rose-600' : 'text-outline'}`}>
                              {isRequired ? 'Mandatory' : 'Optional'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-outline italic">Unavailable while hidden</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: REQUIRED DOCUMENTS & QUERY QUESTIONS */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Category Hierarchy Filters */}
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-4">
                
                {/* 1. Visa Category Pills */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary">category</span>
                      1. Select Visa Intent
                    </label>
                    <span className="text-[11px] text-outline font-medium">
                      {getCategoryDocCount(activeVisaCategory)} items in this intent
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'tourist', label: 'Tourist Visa', icon: 'beach_access' },
                      { id: 'visiting', label: 'Visiting Friends & Family', icon: 'family_restroom' },
                      { id: 'business', label: 'Business / Conference', icon: 'business_center' }
                    ].map(tab => {
                      const isActive = activeVisaCategory === tab.id;
                      const count = getCategoryDocCount(tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveVisaCategory(tab.id)}
                          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                            isActive 
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                              : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:border-primary/40'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">{tab.icon}</span>
                          <span className="truncate">{tab.label}</span>
                          {count > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              isActive ? 'bg-white/25 text-white' : 'bg-surface-container-high text-outline'
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Applicant Category Pills */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-secondary">badge</span>
                      2. Applicant Employment Status
                    </label>
                    <span className="text-[11px] text-outline font-medium">
                      {getCategoryDocCount(activeVisaCategory, activeApplicantCategory)} items configured
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'employed', label: 'Employed', icon: 'work' },
                      { id: 'self_employed', label: 'Self-Employed', icon: 'storefront' },
                      { id: 'student', label: 'Student', icon: 'school' },
                      { id: 'unemployed', label: 'Unemployed / Other', icon: 'person_off' }
                    ].map(tab => {
                      const isActive = activeApplicantCategory === tab.id;
                      const count = getCategoryDocCount(activeVisaCategory, tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveApplicantCategory(tab.id)}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                            isActive 
                              ? 'border-secondary bg-secondary/10 text-secondary font-bold shadow-sm' 
                              : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:border-secondary/40'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                          <span className="truncate">{tab.label}</span>
                          {count > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary/15 text-secondary font-bold">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Document Category / Phase Pills */}
                <div>
                  <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-2">
                    3. Submission Phase & Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'now', label: 'Require Now', sub: 'Mandatory upfront upload', icon: 'upload_file', color: 'emerald' },
                      { id: 'later', label: 'Required Later', sub: 'Post-consultation dossier', icon: 'schedule', color: 'indigo' },
                      { id: 'query', label: 'Query Form Questions', sub: 'Dynamic applicant fields', icon: 'help_outline', color: 'purple' }
                    ].map(tab => {
                      const isActive = activeDocsCategory === tab.id;
                      const count = getCategoryDocCount(activeVisaCategory, activeApplicantCategory, tab.id);
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDocsCategory(tab.id)}
                          className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                            isActive 
                              ? 'bg-surface-container-lowest border-primary shadow-md ring-2 ring-primary/20' 
                              : 'bg-surface-container-lowest/60 border-outline-variant/30 hover:border-outline-variant'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="material-symbols-outlined text-base text-primary">{tab.icon}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive ? 'bg-primary text-white' : 'bg-surface-container-high text-outline'
                            }`}>
                              {count} configured
                            </span>
                          </div>
                          <p className="font-bold text-xs text-on-surface mt-1">{tab.label}</p>
                          <p className="text-[10px] text-outline truncate">{tab.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Add New Document / Question Card */}
              <div className="bg-surface-container-lowest p-5 rounded-2xl border-2 border-primary/20 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">add_circle</span>
                    <h4 className="font-bold text-sm text-on-surface">
                      Add {activeDocsCategory === 'query' ? 'Dynamic Query Question' : (activeDocsCategory === 'now' ? 'Require Now Document' : 'Required Later Document')}
                    </h4>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold capitalize">
                    {activeVisaCategory} • {activeApplicantCategory.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-outline mb-1">
                      {activeDocsCategory === 'query' ? 'Question Label' : 'Document Name'} *
                    </label>
                    <input
                      type="text"
                      value={newDoc.name}
                      onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                      placeholder={activeDocsCategory === 'query' ? 'e.g., What is your intended travel date?' : 'e.g., Valid Passport, Bank Statement (3 Months)...'}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-outline mb-1">
                      {activeDocsCategory === 'query' ? 'Helper / Hint Text (Optional)' : 'Description / Instructions'}
                    </label>
                    <input
                      type="text"
                      value={newDoc.description}
                      onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                      placeholder={activeDocsCategory === 'query' ? 'e.g., Provide exact departure flight date' : 'e.g., Must have at least 6 months remaining validity'}
                      className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 items-end">
                  {activeDocsCategory === 'query' ? (
                    <div>
                      <label className="block text-xs font-bold text-outline mb-1">Answer Field Type</label>
                      <select
                        value={newDoc.type || 'text'}
                        onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs font-semibold cursor-pointer"
                      >
                        <option value="text">Short Text (Single line)</option>
                        <option value="textarea">Long Text (Paragraph / Multi-line)</option>
                        <option value="date">Date Picker</option>
                        <option value="checkbox">Yes/No (Boolean Checkbox)</option>
                      </select>
                    </div>
                  ) : (
                    <div className="relative">
                      <label className="block text-xs font-bold text-outline mb-1">Visual Icon Representation</label>
                      <button
                        type="button"
                        onClick={() => setIconPickerOpen(!iconPickerOpen)}
                        className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/40 flex items-center justify-between text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">
                            {newDoc.icon || 'description'}
                          </span>
                          <span>
                            {DOCUMENT_ICONS.find(i => i.value === newDoc.icon)?.label || 'Document / File'}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-sm">
                          {iconPickerOpen ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {/* Icon Dropdown Menu */}
                      {iconPickerOpen && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1.5 p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 animate-fadeIn">
                          {DOCUMENT_ICONS.map((icon) => (
                            <button
                              key={icon.value}
                              type="button"
                              onClick={() => {
                                setNewDoc({ ...newDoc, icon: icon.value });
                                setIconPickerOpen(false);
                              }}
                              className={`flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                                newDoc.icon === icon.value 
                                  ? 'bg-primary/10 text-primary font-bold' 
                                  : 'hover:bg-surface-container-low text-on-surface'
                              }`}
                            >
                              <span className="material-symbols-outlined text-base shrink-0">
                                {icon.value}
                              </span>
                              <span className="truncate">{icon.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addDocument}
                      disabled={!newDoc.name.trim()}
                      className="w-full py-2.5 px-5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-xs hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      Add {activeDocsCategory === 'query' ? 'Question' : 'Document'} to List
                    </button>
                  </div>
                </div>
              </div>

              {/* Configured Document / Question List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-outline uppercase tracking-wider">
                    Configured {activeDocsCategory === 'query' ? 'Questions' : 'Documents'} ({getActiveDocArray().length})
                  </h4>
                  {getActiveDocArray().length > 0 && (
                    <span className="text-[11px] text-outline">
                      Applicants will see these items in this exact category
                    </span>
                  )}
                </div>

                {getActiveDocArray().map((doc, i) => (
                  <div 
                    key={i} 
                    className="p-3.5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 hover:border-primary/40 transition-all shadow-xs flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-lg">
                          {activeDocsCategory === 'query' ? 'help_outline' : (doc.icon || 'description')}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs sm:text-sm text-on-surface truncate">{doc.name}</p>
                          {activeDocsCategory === 'query' && doc.type && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 uppercase">
                              {doc.type}
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-[11px] text-outline truncate">{doc.description}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeDocument(i)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-error/10 transition-colors cursor-pointer shrink-0"
                      title="Delete item"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                ))}

                {getActiveDocArray().length === 0 && (
                  <div className="p-8 text-center rounded-2xl bg-surface-container-low/40 border border-dashed border-outline-variant/40 space-y-2">
                    <span className="material-symbols-outlined text-outline/60 text-3xl">
                      {activeDocsCategory === 'query' ? 'quiz' : 'inventory_2'}
                    </span>
                    <p className="text-xs font-semibold text-outline">
                      No {activeDocsCategory === 'query' ? 'questions' : 'documents'} added for {activeVisaCategory} ({activeApplicantCategory.replace('_', ' ')}).
                    </p>
                    <p className="text-[11px] text-outline/70">
                      Use the composer card above to add items to this phase.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Live Sticky Action Footer */}
        <div className="px-6 py-4 border-t border-surface-container-high bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-outline w-full sm:w-auto justify-between sm:justify-start">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Fee: <strong>{formatCurrency(totalFee)}</strong>
            </span>
            <span className="text-outline/40">•</span>
            <span>Active Fields: <strong>{activeFieldsCount}</strong></span>
            <span className="text-outline/40">•</span>
            <span>Total Docs: <strong>{totalDocsOverall}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !configForm.citizenship?.trim() || !configForm.destination?.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Saving Configuration...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">
                    {editingConfig ? 'check_circle' : 'add_task'}
                  </span>
                  {editingConfig ? 'Update Configuration' : 'Create Configuration'}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VisaConfigModal;
