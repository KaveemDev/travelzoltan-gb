const Razorpay = require('razorpay');
const { PaymentLink, sequelize } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

// Initialize Razorpay
let razorpay;
const getRazorpayInstance = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay API keys (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured.');
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpay;
};

// Ensure PaymentLink table exists
const ensureTable = async () => {
  try {
    await PaymentLink.sync({ alter: true });
  } catch (err) {
    console.error('[PaymentLinkController] Error ensuring table:', err.message);
  }
};

/**
 * POST /api/admin/payment-links
 * Create a new custom Razorpay Payment Link
 */
const createPaymentLink = async (req, res) => {
  try {
    await ensureTable();
    const {
      amount,
      currency = 'GBP',
      customer_name,
      customer_email,
      customer_phone,
      description,
      notes,
      send_email = true
    } = req.body;

    // Validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Amount must be greater than zero.'
      });
    }

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required.'
      });
    }

    const rzp = getRazorpayInstance();
    const currUpper = (currency || 'GBP').toUpperCase().trim();

    // Standard smallest unit (pence/paise/cents): 100 subunits per unit
    const amountInSubunits = Math.round(parsedAmount * 100);

    // Generate unique internal reference ID
    const refCode = 'ZV-PL-' + Math.floor(100000 + Math.random() * 900000);

    // Prepare Razorpay Payment Link options
    const linkOptions = {
      amount: amountInSubunits,
      currency: currUpper,
      accept_partial: false,
      description: description?.trim() || `Payment for Zoltan Visa Services (${refCode})`,
      customer: {
        name: customer_name.trim(),
        ...(customer_email && customer_email.trim() ? { email: customer_email.trim() } : {}),
        ...(customer_phone && customer_phone.trim() ? { contact: customer_phone.trim() } : {})
      },
      notify: {
        sms: Boolean(customer_phone && customer_phone.trim()),
        email: Boolean(customer_email && customer_email.trim())
      },
      reminder_enable: true,
      notes: {
        reference_id: refCode,
        customer_name: customer_name.trim(),
        customer_email: customer_email?.trim() || '',
        customer_phone: customer_phone?.trim() || '',
        admin_notes: typeof notes === 'string' ? notes : JSON.stringify(notes || ''),
        created_via: 'Admin Dashboard'
      }
    };

    console.log('[createPaymentLink] Creating Razorpay Payment Link:', {
      amount: parsedAmount,
      currency: currUpper,
      customer: customer_name
    });

    const rzpLink = await rzp.paymentLink.create(linkOptions);
    console.log('[createPaymentLink] Razorpay link generated successfully:', rzpLink.id, rzpLink.short_url);

    // Save to Database
    const newRecord = await PaymentLink.create({
      link_id: rzpLink.id,
      short_url: rzpLink.short_url,
      amount: parsedAmount,
      currency: currUpper,
      customer_name: customer_name.trim(),
      customer_email: customer_email?.trim() || null,
      customer_phone: customer_phone?.trim() || null,
      description: description?.trim() || null,
      reference_id: refCode,
      status: rzpLink.status || 'created',
      notes: {
        admin_notes: notes || '',
        razorpay_data: {
          id: rzpLink.id,
          created_at: rzpLink.created_at
        }
      }
    });

    // Optionally send custom branded email via ZeptoMail / SMTP
    let emailSent = false;
    if (send_email && customer_email?.trim()) {
      try {
        emailService.sendCustomPaymentLinkEmail({
          customerName: customer_name.trim(),
          customerEmail: customer_email.trim(),
          amount: parsedAmount,
          currency: currUpper,
          description: description?.trim() || 'Visa Services & Processing',
          paymentLink: rzpLink.short_url,
          referenceId: refCode,
          notes: notes?.trim() || ''
        }).catch(e => console.error('[createPaymentLink] Background email dispatch error:', e.message));
        emailSent = true;
      } catch (err) {
        console.error('[createPaymentLink] Email error:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Payment link generated successfully',
      data: newRecord,
      emailSent
    });
  } catch (error) {
    console.error('[createPaymentLink] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.error?.description || error.message || 'Failed to generate payment link',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/payment-links
 * Fetch all custom payment links with optional filtering
 */
const getAllPaymentLinks = async (req, res) => {
  try {
    await ensureTable();
    const { status, search, limit = 50, page = 0 } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      where[Op.or] = [
        { customer_name: { [Op.like]: searchTerm } },
        { customer_email: { [Op.like]: searchTerm } },
        { customer_phone: { [Op.like]: searchTerm } },
        { link_id: { [Op.like]: searchTerm } },
        { reference_id: { [Op.like]: searchTerm } },
        { description: { [Op.like]: searchTerm } }
      ];
    }

    const offset = parseInt(page) * parseInt(limit);
    const { count, rows } = await PaymentLink.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return res.status(200).json({
      success: true,
      total: count,
      data: rows
    });
  } catch (error) {
    console.error('[getAllPaymentLinks] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment links',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/payment-links/stats
 * Aggregate metrics for payment links
 */
const getPaymentLinkStats = async (req, res) => {
  try {
    await ensureTable();
    const allLinks = await PaymentLink.findAll({
      attributes: ['status', 'amount', 'currency', 'paid_at', 'created_at']
    });

    let totalVolumeGBP = 0;
    let paidVolumeGBP = 0;
    let pendingVolumeGBP = 0;
    let totalCount = allLinks.length;
    let paidCount = 0;
    let createdCount = 0;
    let cancelledCount = 0;

    allLinks.forEach(link => {
      const amt = parseFloat(link.amount) || 0;
      totalVolumeGBP += amt;

      if (link.status === 'paid') {
        paidCount++;
        paidVolumeGBP += amt;
      } else if (link.status === 'created' || link.status === 'partially_paid') {
        createdCount++;
        pendingVolumeGBP += amt;
      } else if (link.status === 'cancelled' || link.status === 'expired') {
        cancelledCount++;
      }
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalCount,
        paidCount,
        createdCount,
        cancelledCount,
        totalVolumeGBP: totalVolumeGBP.toFixed(2),
        paidVolumeGBP: paidVolumeGBP.toFixed(2),
        pendingVolumeGBP: pendingVolumeGBP.toFixed(2),
        conversionRate: totalCount > 0 ? ((paidCount / totalCount) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('[getPaymentLinkStats] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate stats',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/payment-links/:id/sync
 * Sync link status directly from Razorpay
 */
const syncPaymentLink = async (req, res) => {
  try {
    const { id } = req.params;
    const link = await PaymentLink.findByPk(id);

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Payment link record not found'
      });
    }

    const rzp = getRazorpayInstance();
    const freshData = await rzp.paymentLink.fetch(link.link_id);

    const oldStatus = link.status;
    link.status = freshData.status || link.status;

    // Check if payments were received
    if (freshData.payments && freshData.payments.length > 0) {
      const lastPayment = freshData.payments[freshData.payments.length - 1];
      link.payment_id = lastPayment.payment_id || link.payment_id;
      if (lastPayment.status === 'captured' || freshData.status === 'paid') {
        link.paid_at = new Date();
      }
    }

    if (freshData.status === 'paid' && !link.paid_at) {
      link.paid_at = new Date();
    }

    await link.save();

    return res.status(200).json({
      success: true,
      message: `Status refreshed: ${link.status}`,
      data: link,
      statusChanged: oldStatus !== link.status
    });
  } catch (error) {
    console.error('[syncPaymentLink] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.error?.description || error.message || 'Failed to sync payment link with Razorpay',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/payment-links/sync-all
 * Batch sync pending payment links from Razorpay
 */
const syncAllPaymentLinks = async (req, res) => {
  try {
    await ensureTable();
    const pendingLinks = await PaymentLink.findAll({
      where: { status: 'created' },
      limit: 20
    });

    const rzp = getRazorpayInstance();
    let updatedCount = 0;

    for (const link of pendingLinks) {
      try {
        const freshData = await rzp.paymentLink.fetch(link.link_id);
        if (freshData.status && freshData.status !== link.status) {
          link.status = freshData.status;
          if (freshData.status === 'paid') {
            link.paid_at = new Date();
            if (freshData.payments && freshData.payments.length > 0) {
              link.payment_id = freshData.payments[0].payment_id;
            }
          }
          await link.save();
          updatedCount++;
        }
      } catch (e) {
        console.warn(`[syncAllPaymentLinks] Failed to sync ${link.link_id}:`, e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synced ${pendingLinks.length} links. ${updatedCount} updated.`,
      updatedCount
    });
  } catch (error) {
    console.error('[syncAllPaymentLinks] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to batch sync links',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/payment-links/:id/cancel
 * Cancel a created/unpaid payment link in Razorpay
 */
const cancelPaymentLink = async (req, res) => {
  try {
    const { id } = req.params;
    const link = await PaymentLink.findByPk(id);

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Payment link record not found'
      });
    }

    if (link.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a link that has already been paid.'
      });
    }

    const rzp = getRazorpayInstance();
    try {
      await rzp.paymentLink.cancel(link.link_id);
    } catch (rzpErr) {
      console.warn('[cancelPaymentLink] Razorpay cancel warning:', rzpErr.message);
    }

    link.status = 'cancelled';
    await link.save();

    return res.status(200).json({
      success: true,
      message: 'Payment link cancelled successfully',
      data: link
    });
  } catch (error) {
    console.error('[cancelPaymentLink] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.error?.description || error.message || 'Failed to cancel payment link',
      error: error.message
    });
  }
};

/**
 * POST /api/admin/payment-links/:id/send-email
 * Resend the payment link email to the customer
 */
const sendPaymentLinkEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEmail } = req.body;

    const link = await PaymentLink.findByPk(id);
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Payment link record not found'
      });
    }

    const emailToSend = targetEmail || link.customer_email;
    if (!emailToSend) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address is required.'
      });
    }

    await emailService.sendCustomPaymentLinkEmail({
      customerName: link.customer_name,
      customerEmail: emailToSend,
      amount: link.amount,
      currency: link.currency,
      description: link.description || 'Visa Services & Processing',
      paymentLink: link.short_url,
      referenceId: link.reference_id,
      notes: link.notes?.admin_notes || ''
    });

    if (emailToSend !== link.customer_email) {
      link.customer_email = emailToSend;
      await link.save();
    }

    return res.status(200).json({
      success: true,
      message: `Payment link emailed successfully to ${emailToSend}`
    });
  } catch (error) {
    console.error('[sendPaymentLinkEmail] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email',
      error: error.message
    });
  }
};

module.exports = {
  createPaymentLink,
  getAllPaymentLinks,
  getPaymentLinkStats,
  syncPaymentLink,
  syncAllPaymentLinks,
  cancelPaymentLink,
  sendPaymentLinkEmail
};
