import React, { useState, useEffect, useMemo } from 'react';
import { adminAPI } from '../services/api';

const CURRENCIES = [
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'INR', symbol: '₹', label: 'INR (₹) - Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'AED', symbol: 'AED', label: 'AED - UAE Dirham' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD ($) - Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD ($) - Australian Dollar' }
];

const PRESET_AMOUNTS = {
  GBP: [25, 50, 99, 149, 250, 499],
  INR: [1999, 4999, 9999, 14999, 24999],
  USD: [35, 75, 125, 200, 350, 600],
  EUR: [30, 60, 110, 180, 300, 500],
  AED: [150, 300, 500, 800, 1200]
};

const PURPOSE_TEMPLATES = [
  'Express Embassy Appointment Fee',
  'Consular & Visa Processing Surcharge',
  'Additional Document Translation & Legalisation',
  'Fast-Track Visa Filing Assistance',
  'Custom Schengen Holiday Package',
  'Premium Caseworker Consultation'
];

const formatCurrency = (amount, currency = 'GBP') => {
  if (amount === undefined || amount === null || isNaN(amount)) return '£0.00';
  const curr = CURRENCIES.find(c => c.code === currency);
  const symbol = curr ? curr.symbol : `${currency} `;
  return `${symbol}${parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const PaymentLinksTab = ({ showNotification }) => {
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'GBP',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    description: 'Consular & Visa Processing Surcharge',
    notes: '',
    send_email: true
  });

  // Success Created Modal
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Resend Email Modal State
  const [emailModalLink, setEmailModalLink] = useState(null);
  const [customRecipientEmail, setCustomRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Fetch Payment Links
  const fetchLinks = async () => {
    try {
      setLoading(true);
      const [res, statsRes] = await Promise.all([
        adminAPI.getAllPaymentLinks(),
        adminAPI.getPaymentLinkStats().catch(() => null)
      ]);

      if (res.success) {
        setLinks(res.data || []);
      }
      if (statsRes && statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Error fetching payment links:', err);
      showNotification('Failed to load payment links', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  // Handle Copy Link
  const handleCopyLink = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showNotification('Payment link copied to clipboard!');
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Handle Create Link Submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      showNotification('Please enter a valid amount greater than 0', 'error');
      return;
    }

    if (!formData.customer_name.trim()) {
      showNotification('Customer full name is required', 'error');
      return;
    }

    try {
      setCreateSubmitting(true);
      const res = await adminAPI.createPaymentLink({
        amount: amt,
        currency: formData.currency,
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim() || undefined,
        customer_phone: formData.customer_phone.trim() || undefined,
        description: formData.description.trim(),
        notes: formData.notes.trim() || undefined,
        send_email: formData.send_email && Boolean(formData.customer_email.trim())
      });

      if (res.success) {
        showNotification('Razorpay payment link generated successfully!');
        setCreatedResult(res.data);
        setIsCreateOpen(false);
        // Reset form
        setFormData({
          amount: '',
          currency: 'GBP',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          description: 'Consular & Visa Processing Surcharge',
          notes: '',
          send_email: true
        });
        fetchLinks();
      }
    } catch (err) {
      console.error('Error creating payment link:', err);
      showNotification(err.message || 'Failed to generate payment link via Razorpay', 'error');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Single Link Sync
  const handleSyncLink = async (id) => {
    try {
      setActionLoading(true);
      const res = await adminAPI.syncPaymentLink(id);
      if (res.success) {
        showNotification(res.message || 'Status synced with Razorpay');
        fetchLinks();
      }
    } catch (err) {
      console.error('Error syncing link:', err);
      showNotification(err.message || 'Failed to sync link with Razorpay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Sync All Pending
  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      const res = await adminAPI.syncAllPaymentLinks();
      if (res.success) {
        showNotification(res.message || 'Pending links synced');
        fetchLinks();
      }
    } catch (err) {
      console.error('Error syncing all links:', err);
      showNotification(err.message || 'Batch sync failed', 'error');
    } finally {
      setSyncingAll(false);
    }
  };

  // Handle Cancel Link
  const handleCancelLink = async (link) => {
    if (!window.confirm(`Are you sure you want to cancel the payment link for ${link.customer_name} (${formatCurrency(link.amount, link.currency)})?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await adminAPI.cancelPaymentLink(link.id);
      if (res.success) {
        showNotification('Payment link cancelled successfully');
        fetchLinks();
      }
    } catch (err) {
      console.error('Error cancelling payment link:', err);
      showNotification(err.message || 'Failed to cancel payment link', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Send Email Dispatch
  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!customRecipientEmail.trim()) {
      showNotification('Recipient email cannot be empty', 'error');
      return;
    }

    try {
      setSendingEmail(true);
      const res = await adminAPI.sendPaymentLinkEmail(emailModalLink.id, customRecipientEmail.trim());
      if (res.success) {
        showNotification(`Payment link emailed to ${customRecipientEmail.trim()}!`);
        setEmailModalLink(null);
        fetchLinks();
      }
    } catch (err) {
      console.error('Error sending email:', err);
      showNotification(err.message || 'Failed to dispatch email', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  // Filtered links
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      // Status
      if (statusFilter !== 'all' && link.status !== statusFilter) {
        return false;
      }
      // Currency
      if (currencyFilter !== 'all' && link.currency !== currencyFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (link.customer_name || '').toLowerCase();
        const email = (link.customer_email || '').toLowerCase();
        const phone = (link.customer_phone || '').toLowerCase();
        const ref = (link.reference_id || '').toLowerCase();
        const linkId = (link.link_id || '').toLowerCase();
        const desc = (link.description || '').toLowerCase();

        return name.includes(q) || email.includes(q) || phone.includes(q) || ref.includes(q) || linkId.includes(q) || desc.includes(q);
      }
      return true;
    });
  }, [links, statusFilter, currencyFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-surface-container-lowest via-surface-container-lowest to-primary/5 p-6 rounded-3xl border border-outline-variant/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">link</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-headline font-bold text-on-surface">
                Custom Razorpay Payment Links
              </h2>
              <p className="text-xs md:text-sm text-outline mt-0.5">
                Generate secure, customized checkout links for bespoke fees, consulate surcharges & direct payments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <button
            type="button"
            disabled={syncingAll || loading}
            onClick={handleSyncAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Batch check pending links on Razorpay"
          >
            <span className={`material-symbols-outlined text-base ${syncingAll ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{syncingAll ? 'Syncing...' : 'Sync Pending'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs md:text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>Create Payment Link</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Links Card */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-outline text-xs font-bold uppercase tracking-wider">
              <span>Total Generated</span>
              <span className="material-symbols-outlined text-primary text-xl">payments</span>
            </div>
            <p className="text-2xl lg:text-3xl font-headline font-bold text-on-surface mt-2">
              {stats?.totalCount || links.length}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-container-high text-xs text-outline flex items-center justify-between">
            <span>Gross Value</span>
            <span className="font-bold text-on-surface">£{stats?.totalVolumeGBP || '0.00'}</span>
          </div>
        </div>

        {/* Paid / Collected Revenue */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-outline text-xs font-bold uppercase tracking-wider">
              <span>Settled / Paid</span>
              <span className="material-symbols-outlined text-emerald-600 text-xl">check_circle</span>
            </div>
            <p className="text-2xl lg:text-3xl font-headline font-bold text-emerald-600 mt-2">
              £{stats?.paidVolumeGBP || '0.00'}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-container-high text-xs text-outline flex items-center justify-between">
            <span>Completed Count</span>
            <span className="font-bold text-emerald-600">{stats?.paidCount || 0} links</span>
          </div>
        </div>

        {/* Pending Deposit Volume */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-outline text-xs font-bold uppercase tracking-wider">
              <span>Active / Awaiting</span>
              <span className="material-symbols-outlined text-amber-500 text-xl">pending</span>
            </div>
            <p className="text-2xl lg:text-3xl font-headline font-bold text-amber-600 mt-2">
              £{stats?.pendingVolumeGBP || '0.00'}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-container-high text-xs text-outline flex items-center justify-between">
            <span>Pending Links</span>
            <span className="font-bold text-amber-600">{stats?.createdCount || 0} open</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-outline text-xs font-bold uppercase tracking-wider">
              <span>Collection Rate</span>
              <span className="material-symbols-outlined text-secondary text-xl">trending_up</span>
            </div>
            <p className="text-2xl lg:text-3xl font-headline font-bold text-on-surface mt-2">
              {stats?.conversionRate || 0}%
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-container-high text-xs text-outline flex items-center justify-between">
            <span>Cancelled / Expired</span>
            <span className="font-medium text-outline">{stats?.cancelledCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search by customer name, email, phone, ref or link ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Statuses ({links.length})</option>
            <option value="created">Pending / Created</option>
            <option value="paid">Paid & Settled</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>

          {/* Currency filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Currencies</option>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchLinks}
            className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
            title="Refresh list"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Payment Links Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-surface-container-high flex items-center justify-between">
          <div>
            <h3 className="font-headline text-base md:text-lg font-bold text-on-surface">
              Generated Payment Links ({filteredLinks.length})
            </h3>
            <p className="text-xs text-outline mt-0.5">
              Live Razorpay checkout links created by administrator
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-outline flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-xs font-semibold">Loading payment links...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="p-16 text-center text-outline flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-3xl">link_off</span>
            </div>
            <p className="font-headline font-bold text-on-surface text-base">No payment links found</p>
            <p className="text-xs max-w-sm">
              {searchQuery || statusFilter !== 'all' || currencyFilter !== 'all'
                ? 'No payment links match your active filters. Try clearing your search.'
                : 'You have not created any custom payment links yet. Click "Create Payment Link" to get started.'}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Create First Payment Link
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-outline text-[11px] uppercase font-bold tracking-wider border-b border-surface-container-high">
                <tr>
                  <th className="p-4 font-bold">Reference / ID</th>
                  <th className="p-4 font-bold">Customer Details</th>
                  <th className="p-4 font-bold">Description / Purpose</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Date Created</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low text-xs sm:text-sm">
                {filteredLinks.map((link) => {
                  const isPaid = link.status === 'paid';
                  const isCancelled = link.status === 'cancelled';
                  const isPending = link.status === 'created' || link.status === 'partially_paid';

                  return (
                    <tr key={link.id} className="hover:bg-surface-container-low/40 transition-colors">
                      {/* Ref / ID */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-on-surface flex items-center gap-1">
                            {link.reference_id || `ZV-PL-${link.id}`}
                          </span>
                          <span className="text-[11px] font-mono text-outline truncate max-w-[120px]" title={link.link_id}>
                            {link.link_id}
                          </span>
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {(link.customer_name || 'ZV').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-xs sm:text-sm leading-tight">
                              {link.customer_name}
                            </p>
                            {link.customer_email && (
                              <p className="text-[11px] text-outline mt-0.5 truncate max-w-[170px]" title={link.customer_email}>
                                {link.customer_email}
                              </p>
                            )}
                            {link.customer_phone && (
                              <p className="text-[11px] text-outline mt-0.2">
                                {link.customer_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="p-4">
                        <div className="max-w-[200px]">
                          <p className="font-medium text-xs text-on-surface truncate" title={link.description}>
                            {link.description || 'Visa Processing Services'}
                          </p>
                          {link.notes?.admin_notes && (
                            <p className="text-[11px] text-outline truncate mt-0.5" title={link.notes.admin_notes}>
                              Note: {link.notes.admin_notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className={`font-bold font-headline text-sm sm:text-base ${isPaid ? 'text-emerald-600' : 'text-on-surface'}`}>
                            {formatCurrency(link.amount, link.currency)}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-outline">
                            {link.currency}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Paid
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            <span className="material-symbols-outlined text-sm">cancel</span>
                            Cancelled
                          </span>
                        ) : link.status === 'expired' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            <span className="material-symbols-outlined text-sm">alarm_off</span>
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <span className="material-symbols-outlined text-sm">hourglass_top</span>
                            Pending
                          </span>
                        )}
                        {link.payment_id && (
                          <p className="text-[10px] font-mono text-outline mt-1 truncate max-w-[110px]" title={link.payment_id}>
                            Pay: {link.payment_id}
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-4 text-xs text-outline whitespace-nowrap">
                        {formatDate(link.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(link.short_url, link.id)}
                            className="p-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-primary hover:text-white text-on-surface transition-all cursor-pointer"
                            title="Copy Payment Link"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {copiedId === link.id ? 'check' : 'content_copy'}
                            </span>
                          </button>

                          {/* Open in new tab */}
                          <a
                            href={link.short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-primary hover:text-white text-on-surface transition-all cursor-pointer"
                            title="Open Razorpay Checkout Page"
                          >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                          </a>

                          {/* Email Link */}
                          <button
                            type="button"
                            onClick={() => {
                              setEmailModalLink(link);
                              setCustomRecipientEmail(link.customer_email || '');
                            }}
                            className="p-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-emerald-600 hover:text-white text-on-surface transition-all cursor-pointer"
                            title="Email Link to Customer"
                          >
                            <span className="material-symbols-outlined text-sm">mail</span>
                          </button>

                          {/* Sync Status Button */}
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleSyncLink(link.id)}
                            className="p-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high text-on-surface transition-all cursor-pointer disabled:opacity-50"
                            title="Sync status with Razorpay"
                          >
                            <span className="material-symbols-outlined text-sm">sync</span>
                          </button>

                          {/* Cancel button if pending */}
                          {isPending && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleCancelLink(link)}
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 transition-all cursor-pointer disabled:opacity-50"
                              title="Cancel Payment Link"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CREATE PAYMENT LINK MODAL                                                */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl border border-outline-variant/40 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-container-high flex items-center justify-between bg-gradient-to-r from-surface-container-lowest to-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">add_link</span>
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">
                    Generate Custom Payment Link
                  </h3>
                  <p className="text-xs text-outline mt-0.5">
                    Creates an instant Razorpay hosted payment link for your client
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-xl text-outline hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              {/* Amount & Currency Grid */}
              <div className="bg-surface-container-low/70 p-4 rounded-2xl border border-outline-variant/30 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-outline">
                  Payment Amount & Currency *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Currency Selector */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-outline mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm font-bold bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none cursor-pointer"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Input */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-outline mb-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-headline font-bold text-primary text-base">
                        {CURRENCIES.find(c => c.code === formData.currency)?.symbol || '£'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        placeholder="e.g. 150.00"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 font-headline text-base font-bold bg-surface-container-lowest rounded-xl border border-outline-variant/40 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Chips */}
                {PRESET_AMOUNTS[formData.currency] && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-outline font-medium mr-1">Quick Select:</span>
                    {PRESET_AMOUNTS[formData.currency].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, amount: val.toString() })}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          formData.amount === val.toString()
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface hover:border-primary'
                        }`}
                      >
                        {CURRENCIES.find(c => c.code === formData.currency)?.symbol}{val}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Customer Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. client@example.com"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Customer Phone / WhatsApp (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +447123456789 or +919876543210"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
              </div>

              {/* Purpose & Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-on-surface">
                    Payment Purpose / Description *
                  </label>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fast-Track Consular Visa Processing Fee"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
                />

                {/* Purpose Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[11px] text-outline">Suggestions:</span>
                  {PURPOSE_TEMPLATES.map(tpl => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setFormData({ ...formData, description: tpl })}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/20 text-outline transition-colors cursor-pointer truncate max-w-[220px]"
                      title={tpl}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Internal Administrative Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Reference internal case number, client requirements, or special terms..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none transition-all"
                />
              </div>

              {/* Send Email Checkbox */}
              <div className="flex items-center gap-2.5 bg-surface-container-low/60 p-3 rounded-xl border border-outline-variant/20">
                <input
                  type="checkbox"
                  id="send_email_checkbox"
                  checked={formData.send_email}
                  disabled={!formData.customer_email.trim()}
                  onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                />
                <label htmlFor="send_email_checkbox" className={`text-xs select-none cursor-pointer ${!formData.customer_email.trim() ? 'opacity-60' : 'text-on-surface font-medium'}`}>
                  Automatically send branded payment link email to customer upon creation
                  {!formData.customer_email.trim() && ' (Requires customer email)'}
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-surface-container-high flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-xs font-bold hover:bg-surface-container-low transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs md:text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {createSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      <span>Generating Razorpay Link...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">bolt</span>
                      <span>Generate Razorpay Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LINK GENERATION SUCCESS MODAL                                            */}
      {/* ========================================================================= */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl border border-outline-variant/40 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">
                Payment Link Ready!
              </h3>
              <p className="text-xs sm:text-sm text-outline">
                Your live Razorpay payment link for <strong className="text-on-surface">{createdResult.customer_name}</strong> has been generated.
              </p>
            </div>

            {/* Payment Summary Box */}
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-outline">Reference:</span>
                <span className="font-mono font-bold text-on-surface">{createdResult.reference_id}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-outline">Payable Amount:</span>
                <span className="font-headline font-bold text-base text-primary">
                  {formatCurrency(createdResult.amount, createdResult.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-outline">Description:</span>
                <span className="font-medium text-on-surface text-right truncate max-w-[240px]">
                  {createdResult.description || 'Visa Processing'}
                </span>
              </div>
            </div>

            {/* URL Box with 1-Click Copy */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-surface">Payment URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdResult.short_url}
                  className="flex-1 px-3.5 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 text-xs sm:text-sm font-mono text-primary select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(createdResult.short_url, 'success_modal')}
                  className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copiedId === 'success_modal' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedId === 'success_modal' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct Quick Share Actions */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={createdResult.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-outline-variant/40 bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-all"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
                <span>Open Checkout</span>
              </a>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Hello ${createdResult.customer_name}, please find your official Zoltan Visa payment link for ${formatCurrency(createdResult.amount, createdResult.currency)}: ${createdResult.short_url}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Share via WhatsApp</span>
              </a>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setCreatedResult(null)}
              className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all cursor-pointer"
            >
              Done / Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESEND EMAIL MODAL                                                       */}
      {/* ========================================================================= */}
      {emailModalLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl border border-outline-variant/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">send</span>
                </div>
                <h3 className="font-headline font-bold text-on-surface text-base">
                  Email Payment Link
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalLink(null)}
                className="p-1 rounded-lg text-outline hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-outline">
              Send the branded Zoltan Visa invoice and checkout link of{' '}
              <strong className="text-on-surface font-semibold">
                {formatCurrency(emailModalLink.amount, emailModalLink.currency)}
              </strong>{' '}
              to:
            </p>

            <form onSubmit={handleSendEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={customRecipientEmail}
                  onChange={(e) => setCustomRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalLink(null)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/30 text-xs font-bold hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-xs transition-all disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">mail</span>
                      <span>Send Link Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentLinksTab;
