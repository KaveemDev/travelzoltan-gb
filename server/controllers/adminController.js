const { VisaConfiguration, Application, Document, sequelize } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

// Helper function to calculate total fee from breakdown
const calculateTotalFee = (serviceFee) => {
  if (typeof serviceFee === 'object' && serviceFee !== null) {
    return serviceFee.total_amount || (serviceFee.admin_fee || 0) + (serviceFee.service_fee || 0) + (serviceFee.express_fee || 0);
  }
  return parseFloat(serviceFee) || 0;
};

// GET /api/admin/dashboard-stats
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Total applications count
    const totalApplications = await Application.count();

    // Today's applications
    const todayApplications = await Application.count({
      where: { created_at: { [Op.gte]: today } }
    });

    // Pending payment count
    const pendingPayments = await Application.count({
      where: { payment_status: 'pending' }
    });

    // Completed payments count & revenue
    const completedPayments = await Application.findAll({
      where: { payment_status: 'completed' },
      include: [{ model: VisaConfiguration, as: 'visaConfiguration', attributes: ['service_fee'] }]
    });

    const totalRevenue = completedPayments.reduce((sum, app) => {
      return sum + calculateTotalFee(app.visaConfiguration?.service_fee);
    }, 0);

    // Today's revenue
    const todayRevenue = completedPayments
      .filter(app => new Date(app.created_at) >= today)
      .reduce((sum, app) => sum + calculateTotalFee(app.visaConfiguration?.service_fee), 0);

    // Recent applications (last 7 days)
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const recentApplications = await Application.count({
      where: { created_at: { [Op.gte]: last7Days } }
    });

    return res.status(200).json({
      totalApplications,
      todayApplications,
      pendingPayments,
      completedPaymentsCount: completedPayments.length,
      totalRevenue: totalRevenue.toFixed(2),
      todayRevenue: todayRevenue.toFixed(2),
      recentApplications
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/applications
const getAllApplications = async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    
    const whereClause = {};
    if (status && status !== 'all') {
      if (status === 'pending') {
        whereClause.status = { [Op.or]: ['Documents Pending', 'Payment Pending', 'Pending'] };
      } else if (status === 'completed') {
        whereClause.status = 'Process Completed';
      } else if (status === 'failed') {
        whereClause.status = 'Rejected';
      } else {
        whereClause.status = status;
      }
    }
    
    const applications = await Application.findAll({
      where: whereClause,
      include: [
        {
          model: VisaConfiguration,
          as: 'visaConfiguration',
          attributes: ['citizenship', 'destination', 'service_fee']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add application status based on payment_status/status
    const enrichedApplications = applications.map(app => {
      const applicantName = app.user_data?.fullName || 
        (app.user_data?.name ? `${app.user_data.name} ${app.user_data.surname || ''}`.trim() : 'N/A');
      return {
        ...app.toJSON(),
        status: app.status || (app.payment_status === 'completed' ? 'Process Completed' : 
                app.payment_status === 'pending' ? 'Payment Pending' : 'In Review'),
        applicant_name: applicantName,
        email: app.user_data?.email || 'N/A',
        phone: app.user_data?.phone || app.user_data?.phoneLocal || 'N/A',
        query_type: app.user_data?.queryType || (app.status === 'Contact Inquiry' ? 'Contact Inquiry' : null),
        source: app.user_data?.source || (app.status === 'Query Received' ? 'Query Form' : 'Application'),
        visa_type: app.visaConfiguration 
          ? `${app.visaConfiguration.citizenship} to ${app.visaConfiguration.destination}`
          : (app.user_data?.citizenship && app.user_data?.destination 
              ? `${app.user_data.citizenship} to ${app.user_data.destination}` 
              : 'Visa Application')
      };
    });

    const total = await Application.count({ where: whereClause });

    return res.status(200).json({ applications: enrichedApplications, total });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/applications/:id
const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findByPk(id, {
      include: [
        {
          model: VisaConfiguration,
          as: 'visaConfiguration'
        },
        {
          model: Document,
          as: 'documents',
          attributes: ['id', 'document_type', 'file_name', 'storage_type', 'mime_type', 'file_size', 'created_at']
        }
      ]
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const applicantName = application.user_data?.fullName || 
      (application.user_data?.name ? `${application.user_data.name} ${application.user_data.surname || ''}`.trim() : 'N/A');

    const enrichedApplication = {
      ...application.toJSON(),
      status: application.status || (application.payment_status === 'completed' ? 'Process Completed' : 
              application.payment_status === 'pending' ? 'Payment Pending' : 'In Review'),
      applicant_name: applicantName,
      email: application.user_data?.email || 'N/A',
      phone: application.user_data?.phone || application.user_data?.phoneLocal || 'N/A',
      preferredContact: application.user_data?.preferredContact || 'WhatsApp',
      query_type: application.user_data?.queryType || (application.status === 'Contact Inquiry' ? 'Contact Inquiry' : null),
      message: application.user_data?.message || '',
      queryAnswers: application.user_data?.queryAnswers || {},
      source: application.user_data?.source || (application.status === 'Query Received' ? 'Query Form' : 'Application'),
      visa_type: application.visaConfiguration 
        ? `${application.visaConfiguration.citizenship} to ${application.visaConfiguration.destination}`
        : (application.user_data?.citizenship && application.user_data?.destination 
            ? `${application.user_data.citizenship} to ${application.user_data.destination}` 
            : 'Visa Application')
    };

    return res.status(200).json(enrichedApplication);
  } catch (error) {
    console.error('Error fetching application:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/admin/applications/:id/status
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const application = await Application.findByPk(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Map admin status to payment_status
    const statusMap = {
      'Process Completed': 'completed',
      'Payment Received': 'completed',
      'Approved': 'completed',
      'Documents Pending': 'pending',
      'Payment Pending': 'pending',
      'Pending': 'pending',
      'In Review': 'pending',
      'Rejected': 'failed'
    };

    if (statusMap[status]) {
      application.payment_status = statusMap[status];
    }
    
    application.status = status;
    
    if (notes) {
      application.user_data = { ...application.user_data, admin_notes: notes };
    }

    await application.save();

    // Trigger status update email to applicant asynchronously
    try {
      Application.findByPk(application.id, {
        include: [{ model: VisaConfiguration, as: 'visaConfiguration' }]
      }).then(fullApp => {
        const targetApp = fullApp || application;
        if (targetApp.user_data?.email) {
          emailService.sendStatusUpdateEmail({
            application: targetApp,
            newStatus: status,
            notes: notes || ''
          }).catch(err => console.error('[updateApplicationStatus] Status update email error:', err.message));
        }
      }).catch(err => console.error('[updateApplicationStatus] Email fetch error:', err.message));
    } catch (emailErr) {
      console.error('[updateApplicationStatus] Email dispatch error:', emailErr.message);
    }

    return res.status(200).json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/payments
const getAllPayments = async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { payment_status: 'completed' },
      include: [
        {
          model: VisaConfiguration,
          as: 'visaConfiguration',
          attributes: ['citizenship', 'destination', 'service_fee']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const payments = applications.map(app => ({
      id: `PAY-${app.id.toString().padStart(4, '0')}`,
      application_id: app.id,
      customer: app.user_data?.fullName || app.user_data?.name || 'N/A',
      amount: `£${calculateTotalFee(app.visaConfiguration?.service_fee).toFixed(2)}`,
      status: 'Completed',
      method: app.user_data?.paymentMethod || 'Card',
      date: app.created_at,
      visa_type: `${app.visaConfiguration?.citizenship} to ${app.visaConfiguration?.destination}`
    }));

    return res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/payments/stats
const getPaymentStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Today's revenue
    const todayCompleted = await Application.findAll({
      where: { 
        payment_status: 'completed',
        created_at: { [Op.gte]: today }
      },
      include: [{ model: VisaConfiguration, as: 'visaConfiguration', attributes: ['service_fee'] }]
    });
    const todayRevenue = todayCompleted.reduce((sum, app) => sum + calculateTotalFee(app.visaConfiguration?.service_fee), 0);

    // Yesterday's revenue for comparison
    const yesterdayCompleted = await Application.findAll({
      where: { 
        payment_status: 'completed',
        created_at: { [Op.gte]: yesterday, [Op.lt]: today }
      },
      include: [{ model: VisaConfiguration, as: 'visaConfiguration', attributes: ['service_fee'] }]
    });
    const yesterdayRevenue = yesterdayCompleted.reduce((sum, app) => sum + calculateTotalFee(app.visaConfiguration?.service_fee), 0);

    // Monthly revenue
    const monthlyCompleted = await Application.findAll({
      where: { 
        payment_status: 'completed',
        created_at: { [Op.gte]: startOfMonth }
      },
      include: [{ model: VisaConfiguration, as: 'visaConfiguration', attributes: ['service_fee'] }]
    });
    const monthlyRevenue = monthlyCompleted.reduce((sum, app) => sum + calculateTotalFee(app.visaConfiguration?.service_fee), 0);

    // Pending payments
    const pendingCount = await Application.count({ where: { payment_status: 'pending' } });
    const pendingAmount = await Application.findAll({
      where: { payment_status: 'pending' },
      include: [{ model: VisaConfiguration, as: 'visaConfiguration', attributes: ['service_fee'] }]
    });
    const pendingTotal = pendingAmount.reduce((sum, app) => sum + calculateTotalFee(app.visaConfiguration?.service_fee), 0);

    return res.status(200).json({
      todayRevenue: todayRevenue.toFixed(2),
      yesterdayRevenue: yesterdayRevenue.toFixed(2),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      pendingCount,
      pendingTotal: pendingTotal.toFixed(2),
      totalTransactions: todayCompleted.length + yesterdayCompleted.length
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/analytics
const getAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    // Applications by destination
    const byDestination = await Application.findAll({
      include: [{ model: VisaConfiguration, as: 'visaConfiguration', attributes: ['destination'] }],
      where: { created_at: { [Op.gte]: last30Days } }
    });

    const destinationStats = {};
    byDestination.forEach(app => {
      const dest = app.visaConfiguration?.destination || 'Unknown';
      destinationStats[dest] = (destinationStats[dest] || 0) + 1;
    });

    const topDestinations = Object.entries(destinationStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Applications over time (last 7 days)
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const weeklyApps = await Application.findAll({
      where: { created_at: { [Op.gte]: last7Days } },
      order: [['created_at', 'ASC']]
    });

    const dailyStats = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dailyStats[d.toISOString().split('T')[0]] = 0;
    }
    
    weeklyApps.forEach(app => {
      if (!app.created_at) return;
      const date = new Date(app.created_at).toISOString().split('T')[0];
      dailyStats[date] = (dailyStats[date] || 0) + 1;
    });

    // Conversion rate (completed vs total)
    const total = await Application.count({ where: { created_at: { [Op.gte]: last30Days } } });
    const completed = await Application.count({ 
      where: { 
        payment_status: 'completed',
        created_at: { [Op.gte]: last30Days }
      } 
    });

    return res.status(200).json({
      topDestinations,
      dailyTrends: Object.entries(dailyStats).map(([date, count]) => ({ date, count })),
      conversionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
      totalApplications: total,
      completedApplications: completed
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/configurations
const getAllConfigurations = async (req, res) => {
  try {
    const configurations = await VisaConfiguration.findAll({
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });
    return res.status(200).json(configurations);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/admin/configurations
const createConfiguration = async (req, res) => {
  try {
    const { citizenship, destination, service_fee, required_documents, form_schema } = req.body;

    const trimmedCitizenship = citizenship ? citizenship.trim() : '';
    const trimmedDestination = destination ? destination.trim() : '';

    const existing = await VisaConfiguration.findOne({
      where: { citizenship: trimmedCitizenship, destination: trimmedDestination }
    });

    if (existing) {
      return res.status(400).json({ message: 'Configuration for this route already exists' });
    }

    const config = await VisaConfiguration.create({
      citizenship: trimmedCitizenship,
      destination: trimmedDestination,
      service_fee,
      required_documents,
      form_schema
    });

    return res.status(201).json({ message: 'Configuration created successfully', configuration: config });
  } catch (error) {
    console.error('Error creating configuration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/admin/configurations/:id
const updateConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_fee, required_documents, form_schema } = req.body;

    const configuration = await VisaConfiguration.findByPk(id);

    if (!configuration) {
      return res.status(404).json({ message: 'Visa configuration not found.' });
    }

    if (service_fee !== undefined) configuration.service_fee = service_fee;
    if (required_documents !== undefined) configuration.required_documents = required_documents;
    if (form_schema !== undefined) configuration.form_schema = form_schema;
    if (req.body.sort_order !== undefined) configuration.sort_order = req.body.sort_order;

    await configuration.save();

    return res.status(200).json({
      message: 'Configuration updated successfully',
      configuration
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/admin/configurations/reorder
const reorderConfigurations = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: 'orderedIds array is required.' });
    }
    // Bulk-update each config's sort_order to its position in the array
    await Promise.all(
      orderedIds.map((id, index) =>
        VisaConfiguration.update({ sort_order: index }, { where: { id } })
      )
    );
    return res.status(200).json({ message: 'Configurations reordered successfully.' });
  } catch (error) {
    console.error('Error reordering configurations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/admin/configurations/:id
const deleteConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const configuration = await VisaConfiguration.findByPk(id);

    if (!configuration) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    await configuration.destroy();
    return res.status(200).json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting configuration:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/applications/:id/agreement
const getApplicationAgreement = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findByPk(id, {
      include: [{ model: VisaConfiguration, as: 'visaConfiguration' }]
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const agreement = application.user_data?.agreement || null;
    const applicantName = application.user_data?.fullName || 
      (application.user_data?.name ? `${application.user_data.name} ${application.user_data.surname || ''}`.trim() : 'Applicant');

    const defaultAgreement = require('../data/travelVisaAgreementData');

    return res.status(200).json({
      applicationId: application.id,
      applicantName,
      status: application.status,
      hasSignedAgreement: !!agreement?.agreed,
      agreement: agreement || {
        agreed: false,
        agreementTitle: defaultAgreement.AGREEMENT_TITLE,
        agreementSubtitle: defaultAgreement.AGREEMENT_SUBTITLE,
        agreementVersion: defaultAgreement.AGREEMENT_VERSION,
        agreementText: defaultAgreement.RAW_AGREEMENT_TEXT,
        declarationsAccepted: defaultAgreement.CLIENT_DECLARATIONS
      }
    });
  } catch (error) {
    console.error('Error fetching application agreement for admin:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// POST /api/admin/applications/:id/send-invoice
const sendApplicationInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findByPk(id, {
      include: [{ model: VisaConfiguration, as: 'visaConfiguration' }]
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    let userData = application.user_data;
    if (typeof userData === 'string') {
      try {
        userData = JSON.parse(userData);
      } catch (e) {
        userData = {};
      }
    }
    userData = userData || {};

    const applicantEmail = userData.email || userData.emailAddress;
    if (!applicantEmail) {
      return res.status(400).json({ message: 'No email address registered for this applicant.' });
    }

    const result = await emailService.sendInvoiceEmail({
      application,
      paymentDetails: { paymentId: application.payment_id, orderId: application.order_id }
    });

    if (result.success) {
      return res.status(200).json({
        message: 'Invoice & receipt email sent successfully',
        messageId: result.messageId,
        simulated: result.simulated
      });
    } else {
      return res.status(500).json({
        message: 'Failed to send invoice email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending application invoice:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// POST /api/admin/send-test-email
const testEmailConfig = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await emailService.sendTestEmail(email);

    if (result.success) {
      return res.status(200).json({
        message: `Test email dispatched successfully to ${email || process.env.ADMIN_EMAIL || 'support@zoltanvisa.com'}`,
        messageId: result.messageId,
        simulated: result.simulated
      });
    } else {
      return res.status(500).json({
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in testEmailConfig:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  getAllPayments,
  getPaymentStats,
  getAnalytics,
  getAllConfigurations,
  createConfiguration,
  updateConfiguration,
  reorderConfigurations,
  deleteConfiguration,
  getApplicationAgreement,
  sendApplicationInvoice,
  testEmailConfig
};
