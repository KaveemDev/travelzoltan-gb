import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import LiveApprovalsTab from '../components/LiveApprovalsTab';
import TravelVisaAgreementModal from '../components/TravelVisaAgreementModal';
import ConfigurationsTab from '../components/ConfigurationsTab';

// Format currency helper
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '£0.00';
  return `£${parseFloat(amount).toFixed(2)}`;
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const AdminPage = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Data states
  const [dashboardStats, setDashboardStats] = useState(null);
  const [applications, setApplications] = useState({ applications: [], total: 0 });
  const [payments, setPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Filter states
  const [appFilter, setAppFilter] = useState('all');
  const [appSearch, setAppSearch] = useState('');
  const [appPage, setAppPage] = useState(0);
  const [notification, setNotification] = useState(null);

  // Email action states
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // Handle send / resend invoice email
  const handleSendInvoice = async (appId) => {
    try {
      setSendingInvoice(true);
      const res = await adminAPI.sendInvoiceEmail(appId);
      showNotification(res.message || 'Invoice and receipt email dispatched successfully!');
    } catch (err) {
      console.error('Error sending invoice:', err);
      showNotification(err.message || 'Failed to send invoice email', 'error');
    } finally {
      setSendingInvoice(false);
    }
  };

  // Handle sending test email
  const handleTestEmail = async (e) => {
    if (e) e.preventDefault();
    try {
      setTestingEmail(true);
      const res = await adminAPI.sendTestEmail(testEmailAddress);
      showNotification(res.message || 'Test email dispatched successfully!');
    } catch (err) {
      console.error('Error sending test email:', err);
      showNotification(err.message || 'Failed to send test email', 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  // Settings tab states
  const [settingsUsername, setSettingsUsername] = useState(localStorage.getItem('adminUsername') || '');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    if (!settingsUsername.trim()) {
      showNotification('Username cannot be empty', 'error');
      return;
    }
    if (!settingsPassword) {
      showNotification('Password cannot be empty', 'error');
      return;
    }
    if (settingsPassword !== settingsConfirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    try {
      setSettingsLoading(true);
      await adminAPI.changeCredentials(settingsUsername, settingsPassword);
      
      // Update local storage so the session continues with the new credentials
      localStorage.setItem('adminUsername', settingsUsername);
      localStorage.setItem('adminPassword', settingsPassword);
      
      // Update basic auth header locally
      const storedUser = localStorage.getItem('adminUser');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        userObj.username = settingsUsername;
        localStorage.setItem('adminUser', JSON.stringify(userObj));
      }
      
      setSettingsPassword('');
      setSettingsConfirmPassword('');
      showNotification('Username and password updated successfully');
    } catch (err) {
      console.error('Error changing credentials:', err);
      showNotification(err.message || 'Failed to update credentials', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'applications', label: 'Applications', icon: 'description' },
    { id: 'payments', label: 'Payments', icon: 'payments' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'configurations', label: 'Configurations', icon: 'tune' },
    { id: 'live-approvals', label: 'Live Approvals', icon: 'verified' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  // Show notification toast
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Check authentication on mount
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      if (authAPI.isAuthenticated()) {
        try {
          const result = await authAPI.verifyCredentials();
          if (isMounted) {
            if (result.valid) {
              setIsAuthenticated(true);
              setCurrentUser(authAPI.getCurrentUser());
            } else {
              localStorage.removeItem('adminUsername');
              localStorage.removeItem('adminPassword');
              localStorage.removeItem('adminUser');
            }
            setAuthChecking(false);
          }
        } catch (err) {
          const is401 = err.response?.status === 401;
          if (is401) {
            localStorage.removeItem('adminUsername');
            localStorage.removeItem('adminPassword');
            localStorage.removeItem('adminUser');
          }
          if (isMounted) {
            setAuthChecking(false);
          }
        }
      } else {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    };
    
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const result = await authAPI.login(loginForm.username, loginForm.password);
      if (result.success) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        showNotification('Login successful');
      } else {
        setLoginError(result.message || 'Login failed');
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminPassword');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
  };

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      const data = await adminAPI.getDashboardStats();
      setDashboardStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  }, []);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    try {
      const params = { status: appFilter, search: appSearch, limit: 20, offset: appPage * 20 };
      const data = await adminAPI.getAllApplications(params);
      setApplications(data);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load applications');
    }
  }, [appFilter, appSearch, appPage]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      const [paymentsData, statsData] = await Promise.all([
        adminAPI.getAllPayments(),
        adminAPI.getPaymentStats()
      ]);
      setPayments(paymentsData);
      setPaymentStats(statsData);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await adminAPI.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  }, []);

  // Load data on mount and menu change
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      switch (activeMenu) {
        case 'dashboard':
          await fetchDashboardStats();
          await fetchApplications();
          await fetchPayments();
          break;
        case 'applications':
          await fetchApplications();
          break;
        case 'payments':
          await fetchPayments();
          break;
        case 'analytics':
          await fetchAnalytics();
          break;
        default:
          break;
      }
      
      setLoading(false);
    };
    
    loadData();
  }, [isAuthenticated, activeMenu, fetchDashboardStats, fetchApplications, fetchPayments, fetchAnalytics]);

  // Handle view application details
  const handleViewApplication = async (id) => {
    try {
      const app = await adminAPI.getApplicationById(id);
      setSelectedApplication(app);
      setShowModal(true);
    } catch (err) {
      showNotification('Failed to load application details', 'error');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (id, newStatus, notes = '') => {
    try {
      await adminAPI.updateApplicationStatus(id, newStatus, notes);
      showNotification(`Application status updated to ${newStatus}`);
      setShowModal(false);
      setSelectedApplication(null);
      fetchApplications();
      fetchDashboardStats();
    } catch (err) {
      showNotification('Failed to update status', 'error');
    }
  };

  // Export data
  const handleExport = (type) => {
    let data, filename;
    
    switch (type) {
      case 'applications':
        data = applications.applications;
        filename = `applications_${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'payments':
        data = payments;
        filename = `payments_${new Date().toISOString().split('T')[0]}.json`;
        break;
      default:
        return;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Exported ${type} successfully`);
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Process Completed':
      case 'Payment Received':
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'Documents Pending':
      case 'Payment Pending':
      case 'Pending':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'In Review':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'Query Received':
        return 'bg-purple-500/10 text-purple-700 border border-purple-500/20';
      case 'Contact Inquiry':
        return 'bg-orange-500/10 text-orange-700 border border-orange-500/20';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      default:
        return 'bg-surface-container-high text-outline';
    }
  };

  // Render Dashboard
  const renderDashboard = () => {
    if (!dashboardStats) return null;

    const stats = [
      { label: 'Total Applications', value: dashboardStats.totalApplications.toLocaleString(), change: `+${dashboardStats.recentApplications} new`, icon: 'description', color: 'primary' },
      { label: 'Pending Review', value: dashboardStats.pendingPayments.toString(), change: 'Awaiting payment/review', icon: 'pending_actions', color: 'secondary' },
      { label: 'Completed Today', value: dashboardStats.completedPaymentsCount.toString(), change: 'Total completed', icon: 'check_circle', color: 'emerald-600' },
      { label: 'Gross Revenue', value: formatCurrency(dashboardStats.totalRevenue), change: `+${formatCurrency(dashboardStats.todayRevenue)} today`, icon: 'trending_up', color: 'primary' },
    ];

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-outline uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-headline font-bold text-on-surface mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${stat.color === 'emerald-600' ? 'emerald-500/10 text-emerald-600' : `${stat.color}/10 text-${stat.color}`}`}>
                  <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container-high flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
          <h3 className="font-headline text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bolt</span>
            Quick Operational Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => navigate('/checklist')}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              New Application Intake
            </button>
            <button 
              onClick={() => handleExport('applications')}
              className="flex items-center gap-2 bg-surface-container-low text-on-surface px-4 py-2.5 rounded-xl border border-outline-variant/30 font-semibold text-xs sm:text-sm hover:bg-surface-container-high transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg text-primary">download</span>
              Export Applications (JSON)
            </button>
            <button 
              onClick={() => handleExport('payments')}
              className="flex items-center gap-2 bg-surface-container-low text-on-surface px-4 py-2.5 rounded-xl border border-outline-variant/30 font-semibold text-xs sm:text-sm hover:bg-surface-container-high transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg text-secondary">payments</span>
              Export Payments
            </button>
            <button 
              onClick={() => setActiveMenu('configurations')}
              className="flex items-center gap-2 bg-surface-container-low text-on-surface px-4 py-2.5 rounded-xl border border-outline-variant/30 font-semibold text-xs sm:text-sm hover:bg-surface-container-high transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg text-primary">tune</span>
              Manage Visa Routes
            </button>
          </div>
        </div>

        {/* Two Column Layout: Recent Applications & Recent Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Applications */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-lg font-bold text-on-surface">Recent Applications</h3>
              <button 
                onClick={() => setActiveMenu('applications')}
                className="text-primary font-bold text-xs flex items-center gap-1 hover:gap-1.5 transition-all cursor-pointer"
              >
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="space-y-3">
              {applications.applications.slice(0, 5).map((app) => (
                <div 
                  key={app.id} 
                  onClick={() => handleViewApplication(app.id)}
                  className="flex items-center justify-between p-3.5 bg-surface-container-low/60 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer border border-outline-variant/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      <span className="material-symbols-outlined text-sm">person</span>
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-on-surface">{app.applicant_name || 'N/A'}</p>
                      <p className="text-[11px] text-outline">{app.visa_type}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadge(app.status)}`}>
                    {app.status}
                  </span>
                </div>
              ))}
              {applications.applications.length === 0 && (
                <p className="text-center text-outline py-8 text-xs">No recent applications found</p>
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-lg font-bold text-on-surface">Recent Payments</h3>
              <button 
                onClick={() => setActiveMenu('payments')}
                className="text-primary font-bold text-xs flex items-center gap-1 hover:gap-1.5 transition-all cursor-pointer"
              >
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="space-y-3">
              {payments.slice(0, 5).map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-3.5 bg-surface-container-low/60 rounded-xl border border-outline-variant/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-sm">payments</span>
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-on-surface">{payment.customer}</p>
                      <p className="text-[11px] text-outline">{payment.visa_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xs sm:text-sm text-on-surface">{payment.amount}</p>
                    <span className="text-[11px] text-emerald-600 font-bold">Received</span>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-center text-outline py-8 text-xs">No recent payments recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Applications Tab
  const renderApplications = () => {
    const filteredApps = applications.applications.filter(app => {
      const query = appSearch.toLowerCase();
      return (
        appSearch === '' || 
        app.applicant_name?.toLowerCase().includes(query) ||
        app.email?.toLowerCase().includes(query) ||
        app.phone?.toLowerCase().includes(query) ||
        app.visa_type?.toLowerCase().includes(query) ||
        app.query_type?.toLowerCase().includes(query) ||
        app.status?.toLowerCase().includes(query)
      );
    });

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
          {/* Header Controls */}
          <div className="p-6 border-b border-surface-container-high">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  All Applications & Inquiries ({applications.total})
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Manage applicant progress, electronic agreements, and documents
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search applicant, email, phone..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-medium transition-all w-60 sm:w-64"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-base">
                    search
                  </span>
                </div>

                <select
                  value={appFilter}
                  onChange={(e) => { setAppFilter(e.target.value); setAppPage(0); }}
                  className="px-3.5 py-2 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Query Received">🟣 Queries Received</option>
                  <option value="Contact Inquiry">🟠 Contact Inquiries</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="Payment Pending">Payment Pending</option>
                  <option value="Payment Received">Payment Received</option>
                  <option value="In Review">In Review</option>
                  <option value="Process Completed">Process Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <button 
                  onClick={() => handleExport('applications')}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-outline hover:text-on-surface transition-colors cursor-pointer"
                  title="Export Applications to JSON"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-outline text-xs uppercase font-bold tracking-wider border-b border-surface-container-high">
                <tr>
                  <th className="p-4 font-bold">ID</th>
                  <th className="p-4 font-bold">Applicant</th>
                  <th className="p-4 font-bold">Contact</th>
                  <th className="p-4 font-bold">Route / Inquiry</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low text-xs sm:text-sm">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 font-mono text-xs">
                      {app.status === 'Query Received' || app.status === 'Contact Inquiry' ? (
                        <span className="text-purple-600 font-bold">QRY-{app.id.toString().padStart(4, '0')}</span>
                      ) : (
                        <span className="text-outline">APP-{app.id.toString().padStart(4, '0')}</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-on-surface">
                      <div>{app.applicant_name || 'N/A'}</div>
                      {app.query_type && (
                        <span className="text-[11px] text-purple-600 font-medium">{app.query_type}</span>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      {app.email && app.email !== 'N/A' && <div className="text-on-surface font-medium">{app.email}</div>}
                      {app.phone && app.phone !== 'N/A' && <div className="text-outline">{app.phone}</div>}
                      {(!app.email || app.email === 'N/A') && (!app.phone || app.phone === 'N/A') && <div className="text-outline italic">N/A</div>}
                    </td>
                    <td className="p-4 font-medium text-on-surface">{app.visa_type}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4 text-outline text-xs whitespace-nowrap">{formatDate(app.created_at)}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleViewApplication(app.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary hover:text-white transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredApps.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-outline">
                      No applications found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {applications.total > 20 && (
            <div className="p-4 border-t border-surface-container-high flex items-center justify-between text-xs">
              <button 
                onClick={() => setAppPage(Math.max(0, appPage - 1))}
                disabled={appPage === 0}
                className="px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant/30 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-outline font-semibold">
                Page {appPage + 1} of {Math.ceil(applications.total / 20)}
              </span>
              <button 
                onClick={() => setAppPage(appPage + 1)}
                disabled={(appPage + 1) * 20 >= applications.total}
                className="px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant/30 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Payments Tab
  const renderPayments = () => {
    if (!paymentStats) return null;

    const changePercent = paymentStats.yesterdayRevenue > 0 
      ? (((paymentStats.todayRevenue - paymentStats.yesterdayRevenue) / paymentStats.yesterdayRevenue) * 100).toFixed(1)
      : 0;

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Payment KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Today's Collected Revenue</p>
            <p className="text-3xl font-headline font-bold text-on-surface mt-2">{formatCurrency(paymentStats.todayRevenue)}</p>
            <p className={`text-xs mt-2 flex items-center gap-1 font-semibold ${changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <span className="material-symbols-outlined text-sm">{changePercent >= 0 ? 'trending_up' : 'trending_down'}</span>
              {Math.abs(changePercent)}% vs yesterday
            </p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Pending Deposits</p>
            <p className="text-3xl font-headline font-bold text-on-surface mt-2">{formatCurrency(paymentStats.pendingTotal)}</p>
            <p className="text-xs text-amber-600 font-semibold mt-2">{paymentStats.pendingCount} payments pending confirmation</p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Monthly Gross Volume</p>
            <p className="text-3xl font-headline font-bold text-on-surface mt-2">{formatCurrency(paymentStats.monthlyRevenue)}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-2">Current billing calendar month</p>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-surface-container-high flex items-center justify-between">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface">Payment History ({payments.length})</h3>
              <p className="text-xs text-outline mt-0.5">Real-time ledger of card and online transactions</p>
            </div>
            <button 
              onClick={() => handleExport('payments')}
              className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-xl border border-outline-variant/30 text-xs font-bold hover:bg-primary hover:text-white transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export History
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-outline text-xs uppercase font-bold tracking-wider border-b border-surface-container-high">
                <tr>
                  <th className="p-4 font-bold">Transaction Ref</th>
                  <th className="p-4 font-bold">Applicant / Customer</th>
                  <th className="p-4 font-bold">Visa Territory</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Gateway Method</th>
                  <th className="p-4 font-bold">Settled Date</th>
                  <th className="p-4 font-bold text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low text-xs sm:text-sm">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 font-mono text-xs text-outline">{payment.id}</td>
                    <td className="p-4 font-bold text-on-surface">{payment.customer}</td>
                    <td className="p-4 text-outline">{payment.visa_type}</td>
                    <td className="p-4 font-bold text-emerald-600">{payment.amount}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 font-medium text-xs">
                        <span className="material-symbols-outlined text-sm text-primary">
                          {payment.method === 'Card' ? 'credit_card' : payment.method === 'PayPal' ? 'account_balance_wallet' : 'account_balance'}
                        </span>
                        {payment.method}
                      </span>
                    </td>
                    <td className="p-4 text-outline text-xs">{formatDate(payment.date)}</td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        disabled={sendingInvoice}
                        onClick={() => handleSendInvoice(payment.application_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-emerald-600 hover:text-white text-on-surface text-xs font-semibold transition-all border border-outline-variant/30 cursor-pointer disabled:opacity-50"
                        title="Send / Resend Tax Invoice & Receipt Email"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {sendingInvoice ? 'sync' : 'receipt_long'}
                        </span>
                        <span>{sendingInvoice ? 'Sending...' : 'Invoice'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-outline">
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Analytics Tab
  const renderAnalytics = () => {
    if (!analytics) return null;
    const maxCount = Math.max(...analytics.topDestinations.map(d => d.count), 1);

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Analytics Top Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">30-Day Submissions</p>
            <p className="text-2xl font-headline font-bold text-on-surface mt-2">{analytics.totalApplications}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">{analytics.completedApplications} completed</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Conversion Efficiency</p>
            <p className="text-2xl font-headline font-bold text-on-surface mt-2">{analytics.conversionRate}%</p>
            <p className="text-xs text-primary font-semibold mt-1">Processed / Received</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Avg. Daily Intake</p>
            <p className="text-2xl font-headline font-bold text-on-surface mt-2">{(analytics.totalApplications / 30).toFixed(1)}</p>
            <p className="text-xs text-outline font-medium mt-1">Rolling 30 days average</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">Top Destination</p>
            <p className="text-2xl font-headline font-bold text-secondary mt-2 truncate">
              {analytics.topDestinations[0]?.country || 'N/A'}
            </p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              {analytics.topDestinations[0]?.count || 0} active dossiers
            </p>
          </div>
        </div>

        {/* Daily Trends Chart */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
          <h3 className="font-headline text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            Daily Application Volume (Last 7 Days)
          </h3>
          <div className="flex items-end gap-3 h-48 pt-4">
            {analytics.dailyTrends.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div 
                  className="w-full bg-gradient-to-t from-primary to-secondary rounded-t-xl transition-all hover:opacity-85 shadow-xs"
                  style={{ 
                    height: `${Math.max(day.count * 22, 6)}px`,
                    minHeight: day.count > 0 ? '6px' : '3px'
                  }}
                  title={`${day.date}: ${day.count} applications`}
                ></div>
                <span className="text-[11px] font-semibold text-outline whitespace-nowrap">
                  {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Destinations Leaderboard */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
          <h3 className="font-headline text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">public</span>
            Top Destinations Leaderboard (Last 30 Days)
          </h3>
          <div className="space-y-4">
            {analytics.topDestinations.map((dest, idx) => (
              <div key={idx} className="flex items-center gap-4 text-xs sm:text-sm">
                <span className="w-6 font-bold text-outline">{idx + 1}</span>
                <span className="font-bold text-on-surface w-40 truncate">{dest.country}</span>
                <div className="flex-1 max-w-md">
                  <div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all" 
                      style={{ width: `${(dest.count / maxCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-xs font-bold text-outline w-16 text-right">{dest.count}</span>
              </div>
            ))}
            {analytics.topDestinations.length === 0 && (
              <p className="text-center text-outline py-8 text-xs">No analytics data recorded yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Settings Tab
  const renderSettings = () => {
    return (
      <div className="max-w-xl bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs p-6 sm:p-8 space-y-6 animate-fadeIn">
        <div>
          <h3 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">lock_reset</span>
            Change Admin Credentials
          </h3>
          <p className="text-xs text-outline mt-1 leading-relaxed">
            Update the credentials used to access this administrative portal. All passwords are encrypted using secure bcrypt hashing.
          </p>
        </div>
        
        <form onSubmit={handleSettingsUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
              New Username
            </label>
            <input
              type="text"
              required
              value={settingsUsername}
              onChange={(e) => setSettingsUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-semibold"
              placeholder="Enter new admin username"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={settingsPassword}
              onChange={(e) => setSettingsPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-semibold"
              placeholder="Enter secure password"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={settingsConfirmPassword}
              onChange={(e) => setSettingsConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-semibold"
              placeholder="Re-type new password"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={settingsLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xs sm:text-sm rounded-xl hover:shadow-lg transition-all shadow-md disabled:opacity-60 cursor-pointer flex items-center gap-2"
            >
              {settingsLoading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Updating Credentials...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>

        {/* Email & SMTP Diagnostics Card */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">outgoing_mail</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Email Delivery System</h3>
              <p className="text-xs text-outline">Powered by ZeptoMail SMTP (smtp.zeptomail.in)</p>
            </div>
          </div>

          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-outline">Admin Alert Recipient:</span>
              <span className="font-mono font-bold text-primary">support@zoltanvisa.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-outline">Reply-To Address:</span>
              <span className="font-mono font-bold text-primary">support@zoltanvisa.com</span>
            </div>
            <div className="flex justify-between">
              <span className="text-outline">SMTP Server:</span>
              <span className="font-mono text-outline">smtp.zeptomail.in:587</span>
            </div>
            <div className="flex justify-between">
              <span className="text-outline">Automatic Triggers:</span>
              <span className="text-emerald-600 font-bold">Invoices &middot; Leads &middot; Dossiers &middot; Status Changes</span>
            </div>
          </div>

          <form onSubmit={handleTestEmail} className="space-y-3">
            <label className="block text-xs font-bold text-outline uppercase tracking-wider">
              Send Diagnostic Test Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter recipient (e.g. support@zoltanvisa.com)"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs text-on-surface"
              />
              <button
                type="submit"
                disabled={testingEmail}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">
                  {testingEmail ? 'sync' : 'send'}
                </span>
                {testingEmail ? 'Sending...' : 'Send Test'}
              </button>
            </div>
            <p className="text-[11px] text-outline">
              Leave blank to default to the configured admin email (support@zoltanvisa.com).
            </p>
          </form>
        </div>
      </div>
    );
  };

  // Render Login Screen
  const renderLoginScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl p-8 relative overflow-hidden animate-scaleUp">
        {/* Accent banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary"></div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25 text-white">
            <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Zoltan Admin Portal</h1>
          <p className="text-xs text-outline mt-1.5">Sign in to manage visa platform operations</p>
        </div>

        {loginError && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-base">
                person
              </span>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-base">
                lock
              </span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/25 hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loginLoading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
                Verifying Credentials...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">login</span>
                Sign In to Admin
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-surface-container-high text-center">
          <p className="text-xs text-outline">
            Protected management portal • Zoltan Visa Concierge
          </p>
        </div>
      </div>
    </div>
  );

  // Show loading while checking authentication
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex items-center gap-3 text-outline text-sm font-semibold">
          <span className="material-symbols-outlined animate-spin text-primary">sync</span>
          Verifying security session...
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return renderLoginScreen();
  }

  // Main Authenticated Admin Shell
  return (
    <div className="min-h-screen flex bg-surface text-on-surface">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl transition-all animate-slideDown flex items-center gap-2.5 text-xs sm:text-sm font-bold ${
          notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          <span className="material-symbols-outlined text-base">
            {notification.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {notification.message}
        </div>
      )}

      {/* Application Detail Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden transform animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-surface-container-high flex items-center justify-between bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">
                    Application Review #{selectedApplication.id}
                  </h3>
                  <p className="text-xs text-outline">{selectedApplication.visa_type}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowModal(false); setSelectedApplication(null); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 min-h-0">
              {/* Applicant Info Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <p className="text-[11px] text-outline mb-0.5">Applicant Name</p>
                  <p className="font-bold text-sm text-on-surface">{selectedApplication.applicant_name}</p>
                </div>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <p className="text-[11px] text-outline mb-0.5">Email Address</p>
                  <p className="font-bold text-sm text-on-surface">{selectedApplication.email || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <p className="text-[11px] text-outline mb-0.5">Phone Number</p>
                  <p className="font-bold text-sm text-on-surface">{selectedApplication.phone || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <p className="text-[11px] text-outline mb-0.5">WhatsApp / Alt Phone</p>
                  <p className="font-bold text-sm text-on-surface">{selectedApplication.user_data?.alternativePhone || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <p className="text-[11px] text-outline mb-0.5">Passport Number</p>
                  <p className="font-bold text-sm text-on-surface font-mono">{selectedApplication.user_data?.passportNumber || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <p className="text-[11px] text-outline mb-0.5">Nationality</p>
                  <p className="font-bold text-sm text-on-surface">{selectedApplication.user_data?.nationality || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 sm:col-span-2">
                  <p className="text-[11px] text-outline mb-0.5">Residential Address</p>
                  <p className="font-semibold text-on-surface whitespace-pre-line">{selectedApplication.user_data?.residentialAddress || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <p className="text-[11px] text-outline mb-0.5">Employment Status</p>
                  <p className="font-bold capitalize text-on-surface">{selectedApplication.user_data?.applicantStatus || 'N/A'}</p>
                </div>
                <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
                  <p className="text-[11px] text-outline mb-0.5">Visa Intent</p>
                  <p className="font-bold capitalize text-on-surface">{selectedApplication.user_data?.visaCategory || 'N/A'}</p>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2">
                <p className="text-xs font-bold text-outline uppercase tracking-wider">Payment Ledger</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-outline">Status: </span>
                    <span className="font-bold uppercase text-emerald-600">{selectedApplication.payment_status || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-outline">Option: </span>
                    <span className="font-bold capitalize">{selectedApplication.user_data?.paymentOption || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-outline">Amount Paid: </span>
                    <span className="font-bold text-primary">
                      {selectedApplication.user_data?.paymentCurrency ? (
                        `${selectedApplication.user_data.paymentCurrency === 'GBP' ? '£' : 
                           selectedApplication.user_data.paymentCurrency === 'USD' ? '$' : 
                           selectedApplication.user_data.paymentCurrency === 'EUR' ? '€' : 
                           selectedApplication.user_data.paymentCurrency === 'INR' ? '₹' : ''} ${selectedApplication.user_data.paymentAmountGBP || 'N/A'}`
                      ) : 'N/A'}
                    </span>
                  </div>
                  {selectedApplication.payment_id && (
                    <div className="col-span-2">
                      <span className="text-outline">Gateway ID: </span>
                      <span className="font-mono text-xs">{selectedApplication.payment_id}</span>
                    </div>
                  )}

                  {/* Resend Invoice Action */}
                  <div className="col-span-2 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-outline flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
                      Tax Invoice & Receipt
                    </span>
                    <button
                      type="button"
                      disabled={sendingInvoice}
                      onClick={() => handleSendInvoice(selectedApplication.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {sendingInvoice ? 'sync' : 'receipt_long'}
                      </span>
                      {sendingInvoice ? 'Sending...' : 'Send / Resend Invoice Email'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Travel Visa Agreement Electronic Signature Card */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                    <h4 className="font-bold text-xs text-on-surface uppercase tracking-wider">Electronic Agreement</h4>
                  </div>
                  {selectedApplication.user_data?.agreement?.agreed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Signed Electronically
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Pre-agreement / Inquiry
                    </span>
                  )}
                </div>
                {selectedApplication.user_data?.agreement?.agreed && (
                  <button
                    type="button"
                    onClick={() => setShowAgreementModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    View Signed Agreement Copy
                  </button>
                )}
              </div>

              {/* User Inquiry Details & Fast Contact Actions */}
              {(selectedApplication.query_type || selectedApplication.status === 'Query Received' || selectedApplication.status === 'Contact Inquiry' || selectedApplication.message || selectedApplication.user_data?.message || (selectedApplication.queryAnswers && Object.keys(selectedApplication.queryAnswers).length > 0)) && (
                <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-purple-700">help_center</span>
                      <h4 className="font-bold text-purple-950 text-sm">Inquiry Details</h4>
                    </div>
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold border border-purple-300">
                      {selectedApplication.query_type || selectedApplication.user_data?.queryType || 'Inquiry Form'}
                    </span>
                  </div>

                  {(selectedApplication.message || selectedApplication.user_data?.message) && (
                    <div className="bg-white p-3.5 rounded-xl border border-purple-100 text-xs">
                      <p className="font-bold text-purple-900 uppercase tracking-wider mb-1">Message from Applicant</p>
                      <p className="text-on-surface whitespace-pre-line font-medium leading-relaxed">
                        {selectedApplication.message || selectedApplication.user_data?.message}
                      </p>
                    </div>
                  )}

                  {/* Fast Contact Actions */}
                  <div className="pt-2 border-t border-purple-200/60">
                    <p className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-2">Instant Reach Out</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {selectedApplication.phone && selectedApplication.phone !== 'N/A' && (
                        <a
                          href={`https://wa.me/${selectedApplication.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${selectedApplication.applicant_name}, this is Zoltan Visa regarding your query for ${selectedApplication.visa_type}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          WhatsApp
                        </a>
                      )}
                      {selectedApplication.email && selectedApplication.email !== 'N/A' && (
                        <a
                          href={`mailto:${selectedApplication.email}?subject=${encodeURIComponent(`Zoltan Visa - Regarding Your Visa Query (${selectedApplication.visa_type})`)}&body=${encodeURIComponent(`Dear ${selectedApplication.applicant_name},\n\nThank you for contacting Zoltan Visa regarding your inquiry for ${selectedApplication.visa_type}.\n\nBest regards,\nZoltan Visa Team`)}`}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">mail</span>
                          Send Email
                        </a>
                      )}
                      {selectedApplication.phone && selectedApplication.phone !== 'N/A' && (
                        <a
                          href={`tel:${selectedApplication.phone.replace(/\s/g, '')}`}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl font-bold transition-all border border-outline-variant/40"
                        >
                          <span className="material-symbols-outlined text-sm">call</span>
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded Documents Viewer */}
              {selectedApplication.documents && selectedApplication.documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-outline uppercase tracking-wider">
                    Uploaded Documents ({selectedApplication.documents.length})
                  </p>
                  <DocumentViewer documents={selectedApplication.documents} />
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
                  Internal Case Notes
                </label>
                <textarea
                  className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm"
                  rows="3"
                  placeholder="Record confidential notes about this applicant or embassy appointment..."
                  defaultValue={selectedApplication.user_data?.admin_notes || ''}
                  id="adminNotes"
                />
              </div>
            </div>

            {/* Operational Status Action Buttons (Sticky Footer) */}
            <div className="px-6 py-4 border-t border-surface-container-high bg-surface-container-lowest shrink-0 flex gap-2.5 flex-wrap">
              {(selectedApplication.status === 'Query Received' || selectedApplication.status === 'Contact Inquiry') && (
                <button 
                  onClick={() => handleStatusUpdate(selectedApplication.id, 'In Review', document.getElementById('adminNotes')?.value || 'Contacted applicant via ' + (selectedApplication.preferredContact || 'phone/email'))}
                  className="flex-1 py-2.5 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">mark_email_read</span>
                  Mark Contacted
                </button>
              )}
              <button 
                onClick={() => handleStatusUpdate(selectedApplication.id, 'Process Completed', document.getElementById('adminNotes')?.value)}
                className="flex-1 py-2.5 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-xs cursor-pointer"
              >
                Process Completed
              </button>
              <button 
                onClick={() => handleStatusUpdate(selectedApplication.id, 'In Review', document.getElementById('adminNotes')?.value)}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold text-xs cursor-pointer"
              >
                Mark In Review
              </button>
              <button 
                onClick={() => handleStatusUpdate(selectedApplication.id, 'Rejected', document.getElementById('adminNotes')?.value)}
                className="flex-1 py-2.5 px-4 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors font-bold text-xs cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Modal */}
      {selectedApplication && (
        <TravelVisaAgreementModal
          isOpen={showAgreementModal}
          onClose={() => setShowAgreementModal(false)}
          clientDetails={{
            fullName: selectedApplication.user_data?.agreement?.clientName || selectedApplication.applicant_name,
            passportNumber: selectedApplication.user_data?.agreement?.clientPassport || selectedApplication.user_data?.passportNumber,
            email: selectedApplication.user_data?.agreement?.clientEmail || selectedApplication.email,
            agreedAt: selectedApplication.user_data?.agreement?.agreedAt
          }}
          agreementData={selectedApplication.user_data?.agreement}
          isAccepted={true}
        />
      )}

      {/* Modern Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface-container-lowest border-r border-surface-container-high transition-transform transform lg:translate-x-0 flex flex-col justify-between ${
        sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        <div className="p-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md shadow-primary/20">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <div>
                <p className="font-headline font-bold text-base text-on-surface">Zoltan Visa</p>
                <p className="text-[11px] font-semibold text-primary">Concierge Admin</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveMenu(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/25'
                      : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span className={`material-symbols-outlined text-lg ${isActive ? 'text-white' : 'text-outline'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-6 border-t border-surface-container-high space-y-2">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>Sign Out</span>
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">public</span>
            <span>View Public Site</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md border-b border-surface-container-high px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-surface-container-low text-on-surface"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-outline font-semibold">
                <span>Admin</span>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-on-surface capitalize">{activeMenu.replace('-', ' ')}</span>
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface capitalize mt-0.5">
                {activeMenu.replace('-', ' ')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                {currentUser?.username?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-bold text-on-surface hidden sm:inline">
                {currentUser?.username || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-outline">
                <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                Loading dashboard data...
              </div>
            </div>
          )}

          {/* Global Error Notice */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl mb-6 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          {/* Active Tab View */}
          {!loading && (
            <>
              {activeMenu === 'dashboard' && renderDashboard()}
              {activeMenu === 'applications' && renderApplications()}
              {activeMenu === 'payments' && renderPayments()}
              {activeMenu === 'analytics' && renderAnalytics()}
              {activeMenu === 'configurations' && <ConfigurationsTab showNotification={showNotification} />}
              {activeMenu === 'live-approvals' && <LiveApprovalsTab showNotification={showNotification} />}
              {activeMenu === 'settings' && renderSettings()}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
