const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const liveApprovalController = require('../controllers/liveApprovalController');
const paymentLinkController = require('../controllers/paymentLinkController');
const { requireAuth } = require('../middlewares/auth');

// ========== PUBLIC AUTH ROUTES (No authentication required) ==========

// Admin login
router.post('/login', authController.login);

// Verify credentials (for Basic Auth)
router.post('/verify-credentials', authController.verifyCredentials);

// Logout (client-side token removal)
router.post('/logout', authController.logout);

// ========== PROTECTED ADMIN ROUTES (Authentication required) ==========

// Apply authentication middleware to all routes below
router.use(requireAuth);

// Dashboard
router.get('/dashboard-stats', adminController.getDashboardStats);

// Credentials
router.put('/change-credentials', authController.changeCredentials);

// Applications
router.get('/applications', adminController.getAllApplications);
router.get('/applications/:id', adminController.getApplicationById);
router.get('/applications/:id/agreement', adminController.getApplicationAgreement);
router.put('/applications/:id/status', adminController.updateApplicationStatus);
router.post('/applications/:id/send-invoice', adminController.sendApplicationInvoice);

// Email diagnostics
router.post('/send-test-email', adminController.testEmailConfig);

// Payments
router.get('/payments', adminController.getAllPayments);
router.get('/payments/stats', adminController.getPaymentStats);

// Custom Razorpay Payment Links
router.get('/payment-links', paymentLinkController.getAllPaymentLinks);
router.get('/payment-links/stats', paymentLinkController.getPaymentLinkStats);
router.post('/payment-links', paymentLinkController.createPaymentLink);
router.post('/payment-links/sync-all', paymentLinkController.syncAllPaymentLinks);
router.post('/payment-links/:id/sync', paymentLinkController.syncPaymentLink);
router.post('/payment-links/:id/cancel', paymentLinkController.cancelPaymentLink);
router.post('/payment-links/:id/send-email', paymentLinkController.sendPaymentLinkEmail);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Configurations
router.get('/configurations', adminController.getAllConfigurations);
router.post('/configurations', adminController.createConfiguration);
router.put('/configurations/reorder', adminController.reorderConfigurations);
router.put('/configurations/:id', adminController.updateConfiguration);
router.delete('/configurations/:id', adminController.deleteConfiguration);

// Live Visa Approvals
router.get('/live-approvals', liveApprovalController.getAllApprovals);
router.post('/live-approvals', liveApprovalController.createApproval);
router.put('/live-approvals/:id', liveApprovalController.updateApproval);
router.put('/live-approvals/:id/toggle', liveApprovalController.toggleApprovalStatus);
router.delete('/live-approvals/:id', liveApprovalController.deleteApproval);
router.post('/live-approvals/import-from-applications', liveApprovalController.importFromApplications);
router.post('/live-approvals/reset-defaults', liveApprovalController.resetDefaultApprovals);

module.exports = router;
