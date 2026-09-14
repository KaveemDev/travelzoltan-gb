import React, { useState, useEffect, useMemo } from 'react';
import { adminAPI } from '../services/api';
import VisaConfigModal from './VisaConfigModal';
import { 
  DEFAULT_PERSONAL_DETAILS_FIELDS,
  DOCUMENT_ICONS 
} from '../constants/visaConfig';
import { 
  DEFAULT_PAY_NOW_POINTS, 
  DEFAULT_PAY_IN_FULL_POINTS, 
  DEFAULT_WHATS_INCLUDED_POINTS,
  getPayNowPoints, 
  getPayInFullPoints, 
  getWhatsIncludedPoints 
} from '../utils/paymentUtils';

// Format currency helper
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

// Normalize service_fee to object format with amounts and custom points
const normalizeFeeData = (feeData) => {
  if (typeof feeData === 'number' || typeof feeData === 'string') {
    const total = parseFloat(feeData) || 0;
    return {
      total_amount: total,
      pay_now_amount: total,
      pay_in_full_amount: 0,
      pay_now_points: [...DEFAULT_PAY_NOW_POINTS],
      pay_in_full_points: [...DEFAULT_PAY_IN_FULL_POINTS],
      whats_included: [...DEFAULT_WHATS_INCLUDED_POINTS]
    };
  }
  if (!feeData || typeof feeData !== 'object') {
    return {
      total_amount: 0,
      pay_now_amount: 0,
      pay_in_full_amount: 0,
      pay_now_points: [...DEFAULT_PAY_NOW_POINTS],
      pay_in_full_points: [...DEFAULT_PAY_IN_FULL_POINTS],
      whats_included: [...DEFAULT_WHATS_INCLUDED_POINTS]
    };
  }

  const total = feeData.total_amount !== undefined 
    ? parseFloat(feeData.total_amount) || 0 
    : ((feeData.admin_fee || 0) + (feeData.service_fee || 0) + (feeData.express_fee || 0));

  const payNow = feeData.pay_now_amount !== undefined 
    ? parseFloat(feeData.pay_now_amount) || 0 
    : total;

  const payInFull = feeData.pay_in_full_amount !== undefined 
    ? parseFloat(feeData.pay_in_full_amount) || 0 
    : 0;

  return {
    total_amount: total,
    pay_now_amount: payNow,
    pay_in_full_amount: payInFull,
    pay_now_points: getPayNowPoints(feeData),
    pay_in_full_points: getPayInFullPoints(feeData),
    whats_included: getWhatsIncludedPoints(feeData)
  };
};

const defaultRequiredDocs = {
  tourist: {
    student: { now: [], later: [], query: [] },
    employed: { now: [], later: [], query: [] },
    self_employed: { now: [], later: [], query: [] },
    unemployed: { now: [], later: [], query: [] }
  },
  visiting: {
    student: { now: [], later: [], query: [] },
    employed: { now: [], later: [], query: [] },
    self_employed: { now: [], later: [], query: [] },
    unemployed: { now: [], later: [], query: [] }
  },
  business: {
    student: { now: [], later: [], query: [] },
    employed: { now: [], later: [], query: [] },
    self_employed: { now: [], later: [], query: [] },
    unemployed: { now: [], later: [], query: [] }
  }
};

const normalizeRequiredDocs = (docs) => {
  const normalized = JSON.parse(JSON.stringify(defaultRequiredDocs));
  if (!docs || typeof docs !== 'object') {
    return normalized;
  }
  
  const hasNewKeys = ['tourist', 'visiting', 'business'].some(vk => 
    docs[vk] && typeof docs[vk] === 'object' && 
    ['student', 'employed', 'self_employed', 'unemployed'].some(ac => docs[vk][ac])
  );
  
  if (hasNewKeys) {
    ['tourist', 'visiting', 'business'].forEach(vk => {
      if (docs[vk] && typeof docs[vk] === 'object') {
        ['student', 'employed', 'self_employed', 'unemployed'].forEach(ac => {
          if (docs[vk][ac] && typeof docs[vk][ac] === 'object') {
            normalized[vk][ac].now = Array.isArray(docs[vk][ac].now) ? docs[vk][ac].now : [];
            normalized[vk][ac].later = Array.isArray(docs[vk][ac].later) ? docs[vk][ac].later : [];
            normalized[vk][ac].query = Array.isArray(docs[vk][ac].query) ? docs[vk][ac].query : [];
          }
        });
      }
    });
    return normalized;
  }

  let oldNow = [];
  if (Array.isArray(docs.documents_required_now)) {
    oldNow = docs.documents_required_now;
  } else if (Array.isArray(docs.core_documents)) {
    oldNow = docs.core_documents;
  }
  
  ['tourist', 'visiting', 'business'].forEach(vk => {
    ['student', 'employed', 'self_employed', 'unemployed'].forEach(ac => {
      normalized[vk][ac].now = [...oldNow];
    });
  });

  if (docs.required_later && typeof docs.required_later === 'object') {
    const requiredLater = docs.required_later;
    if (requiredLater.common && Array.isArray(requiredLater.common)) {
      ['tourist', 'visiting', 'business'].forEach(vk => {
        ['student', 'employed', 'self_employed', 'unemployed'].forEach(ac => {
          normalized[vk][ac].later = [...normalized[vk][ac].later, ...requiredLater.common];
        });
      });
    }

    if (requiredLater.applicant_category && typeof requiredLater.applicant_category === 'object') {
      const appCat = requiredLater.applicant_category;
      ['student', 'employed', 'self_employed', 'unemployed'].forEach(ac => {
        if (Array.isArray(appCat[ac])) {
          ['tourist', 'visiting', 'business'].forEach(vk => {
            normalized[vk][ac].later = [...normalized[vk][ac].later, ...appCat[ac]];
          });
        }
      });
    }

    if (requiredLater.visa_category && typeof requiredLater.visa_category === 'object') {
      const visaCat = requiredLater.visa_category;
      ['tourist', 'visiting', 'business'].forEach(vk => {
        if (Array.isArray(visaCat[vk])) {
          ['student', 'employed', 'self_employed', 'unemployed'].forEach(ac => {
            normalized[vk][ac].later = [...normalized[vk][ac].later, ...visaCat[vk]];
          });
        }
      });
    }
  }

  return normalized;
};

const getTotalDocsCount = (docs) => {
  const norm = normalizeRequiredDocs(docs);
  const uniqueNames = new Set();
  ['tourist', 'visiting', 'business'].forEach(vk => {
    ['student', 'employed', 'self_employed', 'unemployed'].forEach(ac => {
      ['now', 'later', 'query'].forEach(ph => {
        (norm[vk][ac][ph] || []).forEach(d => {
          const name = typeof d === 'string' ? d : d.name;
          if (name) uniqueNames.add(name);
        });
      });
    });
  });
  return uniqueNames.size;
};

const getFlatDocsArray = (docs) => {
  const norm = normalizeRequiredDocs(docs);
  const uniqueDocs = [];
  const uniqueNames = new Set();
  ['tourist', 'visiting', 'business'].forEach(vk => {
    ['student', 'employed', 'self_employed', 'unemployed'].forEach(ac => {
      ['now', 'later', 'query'].forEach(ph => {
        (norm[vk][ac][ph] || []).forEach(d => {
          const name = typeof d === 'string' ? d : d.name;
          if (name && !uniqueNames.has(name)) {
            uniqueNames.add(name);
            uniqueDocs.push(typeof d === 'string' ? { name: d, icon: 'description' } : d);
          }
        });
      });
    });
  });
  return uniqueDocs;
};

const normalizeFormSchema = (form_schema) => {
  const fields = form_schema?.personal_details_fields || {};
  const result = { personal_details_fields: {} };
  DEFAULT_PERSONAL_DETAILS_FIELDS.forEach(f => {
    const existing = fields[f.id];
    result.personal_details_fields[f.id] = {
      visible: existing?.visible !== undefined ? existing.visible : f.defaultVisible,
      required: existing?.required !== undefined ? existing.required : f.defaultRequired
    };
  });
  return result;
};

const ConfigurationsTab = ({ showNotification }) => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [saving, setSaving] = useState(false);

  const [configForm, setConfigForm] = useState({
    citizenship: '',
    destination: '',
    service_fee: { pay_now_amount: 0, total_amount: 0, pay_in_full_amount: 0 },
    required_documents: JSON.parse(JSON.stringify(defaultRequiredDocs)),
    form_schema: normalizeFormSchema(null)
  });

  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getAllConfigurations();
      setConfigs(data || []);
    } catch (err) {
      showNotification('Failed to load configurations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const cleanedFee = {
        ...configForm.service_fee,
        pay_now_points: Array.isArray(configForm.service_fee?.pay_now_points)
          ? configForm.service_fee.pay_now_points.map(p => p.trim()).filter(Boolean)
          : [],
        pay_in_full_points: Array.isArray(configForm.service_fee?.pay_in_full_points)
          ? configForm.service_fee.pay_in_full_points.map(p => p.trim()).filter(Boolean)
          : [],
        whats_included: Array.isArray(configForm.service_fee?.whats_included)
          ? configForm.service_fee.whats_included.map(p => p.trim()).filter(Boolean)
          : []
      };
      const payload = {
        ...configForm,
        service_fee: cleanedFee
      };

      if (editingConfig) {
        await adminAPI.updateConfiguration(editingConfig.id, payload);
        showNotification('Configuration updated successfully');
      } else {
        await adminAPI.createConfiguration(payload);
        showNotification('Configuration created successfully');
      }
      setShowConfigModal(false);
      setEditingConfig(null);
      loadConfigs();
    } catch (err) {
      showNotification(err.message || 'Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (id) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    try {
      await adminAPI.deleteConfiguration(id);
      showNotification('Configuration deleted successfully');
      loadConfigs();
    } catch (err) {
      showNotification('Failed to delete configuration', 'error');
    }
  };

  const handleDuplicateConfig = (config) => {
    setEditingConfig(null);
    let feeData = normalizeFeeData(config.service_fee);
    setConfigForm({
      citizenship: config.citizenship + ' (Copy)',
      destination: config.destination,
      service_fee: feeData,
      required_documents: normalizeRequiredDocs(config.required_documents),
      form_schema: normalizeFormSchema(config.form_schema)
    });
    setShowConfigModal(true);
  };

  const openEditModal = (config) => {
    setEditingConfig(config);
    let feeData = normalizeFeeData(config.service_fee);
    let docs = config.required_documents;
    let normalizedDocs = normalizeRequiredDocs(docs);

    setConfigForm({
      citizenship: config.citizenship,
      destination: config.destination,
      service_fee: feeData,
      required_documents: normalizedDocs,
      form_schema: normalizeFormSchema(config.form_schema)
    });
    setShowConfigModal(true);
  };

  const openCreateModal = () => {
    setEditingConfig(null);
    setConfigForm({
      citizenship: '',
      destination: '',
      service_fee: {
        total_amount: 0,
        pay_now_amount: 0,
        pay_in_full_amount: 0,
        pay_now_points: [...DEFAULT_PAY_NOW_POINTS],
        pay_in_full_points: [...DEFAULT_PAY_IN_FULL_POINTS],
        whats_included: [...DEFAULT_WHATS_INCLUDED_POINTS]
      },
      required_documents: JSON.parse(JSON.stringify(defaultRequiredDocs)),
      form_schema: normalizeFormSchema(null)
    });
    setShowConfigModal(true);
  };

  // Drag and drop reordering handlers
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...configs];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setConfigs(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
    try {
      await adminAPI.reorderConfigurations(reordered.map(c => c.id));
      showNotification('Configuration ordering updated successfully');
    } catch (err) {
      showNotification('Failed to save route order', 'error');
      loadConfigs();
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Filtered configs based on search query
  const filteredConfigs = useMemo(() => {
    if (!searchQuery.trim()) return configs;
    const q = searchQuery.toLowerCase().trim();
    return configs.filter(c => 
      c.citizenship?.toLowerCase().includes(q) ||
      c.destination?.toLowerCase().includes(q)
    );
  }, [configs, searchQuery]);

  // Quick stats
  const uniqueDestinationsCount = useMemo(() => {
    return new Set(configs.map(c => c.destination).filter(Boolean)).size;
  }, [configs]);

  const averageFee = useMemo(() => {
    if (configs.length === 0) return 0;
    const sum = configs.reduce((acc, c) => acc + calculateTotalFee(c.service_fee), 0);
    return sum / configs.length;
  }, [configs]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Total Visa Routes</p>
            <p className="text-2xl font-headline font-bold text-on-surface mt-1">{configs.length}</p>
            <p className="text-xs text-outline mt-0.5">Drag rows to prioritize routes</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">route</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Unique Destinations</p>
            <p className="text-2xl font-headline font-bold text-on-surface mt-1">{uniqueDestinationsCount}</p>
            <p className="text-xs text-outline mt-0.5">Global destination coverage</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-2xl">public</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Avg. Concierge Fee</p>
            <p className="text-2xl font-headline font-bold text-on-surface mt-1">{formatCurrency(averageFee)}</p>
            <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-xs">verified</span>
              Live Commercials
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
        </div>
      </div>

      {/* Action Header & Search Bar */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by citizenship or destination..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-medium transition-all"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
              search
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-xs text-outline font-semibold whitespace-nowrap">
              {filteredConfigs.length} of {configs.length} routes
            </span>
          )}
        </div>

        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          Add Configuration
        </button>
      </div>

      {/* Main Configurations Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-outline text-xs uppercase font-bold tracking-wider border-b border-surface-container-high">
              <tr>
                <th className="py-4 px-3 w-10 text-center select-none" title="Drag row handle to reorder">#</th>
                <th className="py-4 px-4 font-bold">Route (Citizenship ➔ Destination)</th>
                <th className="py-4 px-4 font-bold">Commercials / Fees</th>
                <th className="py-4 px-4 font-bold">Configured Documents</th>
                <th className="py-4 px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-xs sm:text-sm">
              {filteredConfigs.map((config, index) => {
                const total = calculateTotalFee(config.service_fee);
                const payNow = config.service_fee?.pay_now_amount;
                const payInFull = config.service_fee?.pay_in_full_amount;
                const flatDocs = getFlatDocsArray(config.required_documents);
                const totalDocs = getTotalDocsCount(config.required_documents);
                const isDragging = dragIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <tr
                    key={config.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all ${
                      isDragging
                        ? 'opacity-30 bg-primary/5'
                        : isDragOver
                        ? 'bg-primary/10 border-t-2 border-t-primary'
                        : 'hover:bg-surface-container-low/40'
                    }`}
                  >
                    {/* Grip handle */}
                    <td className="py-4 px-3 text-center cursor-grab active:cursor-grabbing text-outline/40 hover:text-primary transition-colors select-none">
                      <span className="material-symbols-outlined text-lg" title="Drag to reorder">
                        drag_indicator
                      </span>
                    </td>

                    {/* Route Details */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 font-bold text-on-surface text-sm sm:text-base">
                            <span>{config.citizenship}</span>
                            <span className="material-symbols-outlined text-primary text-sm">arrow_forward</span>
                            <span className="text-secondary">{config.destination}</span>
                          </div>
                          <span className="text-[11px] text-outline mt-0.5">
                            Route ID #{config.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Commercials */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface text-sm">
                            {formatCurrency(total)}
                          </span>
                          {payNow !== undefined && payNow > 0 && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              Deposit: {formatCurrency(payNow)}
                            </span>
                          )}
                        </div>
                        {payInFull !== undefined && payInFull > 0 && payInFull < total && (
                          <span className="text-[11px] text-outline flex items-center gap-1">
                            Pay in full: <strong className="text-secondary">{formatCurrency(payInFull)}</strong>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Documents */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {flatDocs.slice(0, 3).map((doc, i) => (
                          <span 
                            key={i} 
                            className="px-2.5 py-1 bg-surface-container-low rounded-lg text-xs font-medium flex items-center gap-1.5 border border-outline-variant/30 text-on-surface-variant"
                          >
                            <span className="material-symbols-outlined text-xs text-primary">
                              {doc.icon || 'description'}
                            </span>
                            <span className="truncate max-w-[120px]">{doc.name || doc}</span>
                          </span>
                        ))}
                        {totalDocs > 3 && (
                          <span className="px-2 py-1 bg-surface-container-high rounded-lg text-[11px] font-bold text-outline">
                            +{totalDocs - 3} more
                          </span>
                        )}
                        {totalDocs === 0 && (
                          <span className="text-xs text-outline italic">No required documents</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          type="button"
                          onClick={() => openEditModal(config)}
                          title="Edit configuration"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDuplicateConfig(config)}
                          title="Duplicate configuration"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">content_copy</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteConfig(config.id)}
                          title="Delete configuration"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-error/10 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredConfigs.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-3xl">route</span>
                      </div>
                      <div>
                        <p className="font-bold text-base text-on-surface">No configurations found</p>
                        <p className="text-xs text-outline mt-0.5">
                          {searchQuery ? `No routes matching "${searchQuery}"` : 'Get started by creating your first visa configuration route.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Create Configuration
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Configuration Dialog */}
      <VisaConfigModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setEditingConfig(null);
        }}
        onSave={handleSaveConfig}
        editingConfig={editingConfig}
        configForm={configForm}
        setConfigForm={setConfigForm}
        saving={saving}
      />
    </div>
  );
};

export default ConfigurationsTab;
