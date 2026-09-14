const nodemailer = require('nodemailer');

// Helper to create transporter using current env variables
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.zeptomail.in';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || 'emailapikey';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false // avoids self-signed or proxy TLS issues
    }
  });
};

const getSender = () => {
  return process.env.EMAIL_FROM || '"Zoltan Visa" <noreply@zovotel.com>';
};

const getReplyTo = () => {
  return process.env.EMAIL_REPLY_TO || 'support@zoltanvisa.com';
};

const getAdminEmail = () => {
  return process.env.ADMIN_EMAIL || 'support@zoltanvisa.com';
};

// Safe email dispatch wrapper
const sendEmail = async ({ to, subject, html, replyTo, bcc, text }) => {
  try {
    if (!to || to === 'N/A') {
      console.warn('[emailService] No recipient email specified, skipping email dispatch.');
      return { success: false, message: 'No recipient email specified' };
    }

    if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'your_zeptomail_api_key_here') {
      console.warn('[emailService] ZeptoMail SMTP password not configured in SMTP_PASS. Email logging only.');
      console.log(`[emailService Simulation] To: ${to} | Subject: ${subject}`);
      return { 
        success: true, 
        simulated: true, 
        message: 'SMTP credentials pending configuration. Email logged in console.' 
      };
    }

    const transporter = getTransporter();
    const mailOptions = {
      from: getSender(),
      to,
      subject,
      html,
      replyTo: replyTo || getReplyTo(),
      ...(bcc ? { bcc } : {}),
      ...(text ? { text } : {})
    };

    console.log(`[emailService] Sending email to: ${to}, subject: "${subject}" via ZeptoMail...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[emailService] Email sent successfully! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[emailService] Error sending email:', error.message);
    return { success: false, error: error.message };
  }
};

// Common Email Container Styles
const getBaseEmailLayout = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zoltan Visa & Travel</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 30px 10px; }
    .main-card { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 30px; text-align: left; }
    .brand-title { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0; }
    .brand-tagline { font-size: 12px; font-weight: 600; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .body-content { padding: 32px 30px; color: #1e293b; line-height: 1.6; }
    .footer { background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    .footer a { color: #2563eb; text-decoration: none; font-weight: 600; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin: 20px 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-success { background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-primary { background-color: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
    .badge-warning { background-color: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
    .table-details { width: 100%; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .table-details th { background-color: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; text-align: left; }
    .table-details td { padding: 14px 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #1e293b; }
    .highlight-box { background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #334155; }
    @media only screen and (max-width: 600px) {
      .header { padding: 24px 20px; }
      .body-content { padding: 24px 20px; }
      .brand-title { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${preheader}
  </div>
  <table class="wrapper" role="presentation">
    <tr>
      <td align="center">
        <div class="main-card">
          <!-- Header -->
          <div class="header">
            <table width="100%">
              <tr>
                <td>
                  <h1 class="brand-title">ZOLTAN VISA</h1>
                  <div class="brand-tagline">Global Travel & Visa Concierge</div>
                </td>
                <td align="right">
                  <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 12px; display: inline-block;">
                    <span style="color: #ffffff; font-size: 12px; font-weight: 700;">UK Support</span>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Body -->
          <div class="body-content">
            ${content}
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">Zoltan Visa Services &middot; Great Britain</p>
            <p style="margin: 0 0 12px 0;">Official Visa Advisory, Case Checking & Embassy Submission Management.</p>
            <p style="margin: 0 0 12px 0;">
              Need help? Reach our team at <a href="mailto:support@zoltanvisa.com">support@zoltanvisa.com</a>
            </p>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} Zoltan Visa. All rights reserved. This communication is governed by the Travel Visa Assistance Agreement.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. Send Official Tax Invoice & Payment Receipt to Applicant
 */
const sendInvoiceEmail = async ({ application, paymentDetails = {} }) => {
  const userData = application.user_data || {};
  const applicantEmail = userData.email;
  const applicantName = userData.fullName || [userData.name, userData.surname].filter(Boolean).join(' ') || 'Valued Client';
  const passportNumber = userData.passportNumber || 'On file';
  const residentialAddress = userData.residentialAddress || 'N/A';
  
  const config = application.visaConfiguration || {};
  const citizenship = config.citizenship || userData.citizenship || 'United Kingdom';
  const destination = config.destination || userData.destination || 'Europe (Schengen States)';
  const route = `${citizenship} to ${destination}`;

  const paymentId = application.payment_id || paymentDetails.paymentId || 'N/A';
  const orderId = application.order_id || paymentDetails.orderId || 'N/A';
  const currency = userData.paymentCurrency || 'GBP';
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'INR' ? '₹' : '£';
  
  let totalAmount = userData.paymentAmountGBP || 0;
  if (!totalAmount && config.service_fee) {
    totalAmount = typeof config.service_fee === 'object' 
      ? (config.service_fee.total_amount || config.service_fee.service_fee || 130)
      : parseFloat(config.service_fee) || 130;
  }
  const formattedAmount = `${currencySymbol}${parseFloat(totalAmount).toFixed(2)}`;

  const invoiceNumber = `INV-GB-${application.id.toString().padStart(5, '0')}`;
  const invoiceDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const content = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
      <div>
        <span class="badge badge-success">PAYMENT CONFIRMED &bull; INVOICE PAID</span>
        <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 12px 0 4px 0;">Tax Invoice & Payment Receipt</h2>
        <p style="font-size: 13px; color: #64748b; margin: 0;">Invoice Ref: <strong>${invoiceNumber}</strong> &middot; ${invoiceDate}</p>
      </div>
    </div>

    <p style="font-size: 15px; margin-bottom: 20px;">
      Dear <strong>${applicantName}</strong>,<br>
      Thank you for choosing Zoltan Visa. Your payment has been received successfully. Below is your official receipt and breakdown of services.
    </p>

    <!-- Invoice Meta & Billing Grid -->
    <table width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
      <tr>
        <td width="50%" style="vertical-align: top; padding-right: 12px;">
          <p style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 4px 0;">Billed To</p>
          <p style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 2px 0;">${applicantName}</p>
          <p style="font-size: 12px; color: #475569; margin: 0 0 2px 0;">Email: ${applicantEmail}</p>
          <p style="font-size: 12px; color: #475569; margin: 0 0 2px 0;">Passport: ${passportNumber}</p>
          <p style="font-size: 12px; color: #475569; margin: 0;">Address: ${residentialAddress}</p>
        </td>
        <td width="50%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid #e2e8f0;">
          <p style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 4px 0;">Payment Information</p>
          <p style="font-size: 12px; color: #475569; margin: 0 0 2px 0;">Application Ref: <strong>#${application.id}</strong></p>
          <p style="font-size: 12px; color: #475569; margin: 0 0 2px 0;">Gateway Payment ID: <strong style="font-family: monospace; font-size: 11px;">${paymentId}</strong></p>
          <p style="font-size: 12px; color: #475569; margin: 0 0 2px 0;">Gateway Order ID: <strong style="font-family: monospace; font-size: 11px;">${orderId}</strong></p>
          <p style="font-size: 12px; color: #475569; margin: 0;">Payment Method: <strong>Online Card / Gateway</strong></p>
        </td>
      </tr>
    </table>

    <!-- Itemized Services Table -->
    <table class="table-details" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th>Description of Services</th>
          <th>Route / Category</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Visa Assistance & Concierge Case Review</strong>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Document auditing, appointment slot scheduling, and embassy file preparation
            </div>
          </td>
          <td style="font-size: 12px;">${route}</td>
          <td style="text-align: right; font-weight: 700;">${formattedAmount}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td colspan="2" style="text-align: right; font-weight: 700; font-size: 13px;">Total Paid:</td>
          <td style="text-align: right; font-weight: 800; font-size: 16px; color: #15803d;">${formattedAmount}</td>
        </tr>
      </tbody>
    </table>

    <!-- Next Steps Section -->
    <div class="highlight-box">
      <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1e3a8a;">What happens next?</h3>
      <ol style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.6; color: #334155;">
        <li>Our dedicated immigration concierge team is verifying your submitted documents.</li>
        <li>We will secure and optimize your embassy appointment booking slot.</li>
        <li>You will receive your finalized appointment confirmation and visa application pack via email.</li>
      </ol>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
      If you need to provide additional documentation or have questions regarding your application, reply directly to this email or reach us on WhatsApp.
    </p>
  `;

  const html = getBaseEmailLayout(content, `Invoice & Payment Receipt for Application #${application.id} - ${formattedAmount}`);

  // Send to applicant
  return await sendEmail({
    to: applicantEmail,
    subject: `Payment Receipt & Tax Invoice - Zoltan Visa Ref #${application.id}`,
    html,
    replyTo: getReplyTo()
  });
};

/**
 * 2. Send Immediate Payment Alert to Admin (support@zoltanvisa.com)
 */
const sendAdminPaymentAlert = async ({ application, paymentDetails = {} }) => {
  const userData = application.user_data || {};
  const applicantName = userData.fullName || [userData.name, userData.surname].filter(Boolean).join(' ') || 'Applicant';
  const config = application.visaConfiguration || {};
  const citizenship = config.citizenship || userData.citizenship || 'United Kingdom';
  const destination = config.destination || userData.destination || 'Europe (Schengen States)';
  const route = `${citizenship} to ${destination}`;

  const paymentId = application.payment_id || paymentDetails.paymentId || 'N/A';
  const currency = userData.paymentCurrency || 'GBP';
  const amount = userData.paymentAmountGBP || '130.00';

  const content = `
    <div style="border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 20px;">
      <span class="badge badge-success">&bull; NEW TRANSACTION RECEIVED</span>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 10px 0 4px 0;">New Payment Verified & Received</h2>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Application #${application.id} &middot; Amount: <strong>${currency} ${amount}</strong></p>
    </div>

    <table class="table-details" cellpadding="0" cellspacing="0">
      <tr>
        <th width="35%">Applicant Name</th>
        <td><strong>${applicantName}</strong></td>
      </tr>
      <tr>
        <th>Email Address</th>
        <td><a href="mailto:${userData.email}">${userData.email || 'N/A'}</a></td>
      </tr>
      <tr>
        <th>Phone / WhatsApp</th>
        <td>${userData.phone || userData.phoneLocal || 'N/A'}</td>
      </tr>
      <tr>
        <th>Visa Route</th>
        <td>${route}</td>
      </tr>
      <tr>
        <th>Amount Settled</th>
        <td><strong style="color: #15803d; font-size: 15px;">${currency} ${amount}</strong></td>
      </tr>
      <tr>
        <th>Gateway Payment ID</th>
        <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${paymentId}</code></td>
      </tr>
      <tr>
        <th>Current Status</th>
        <td><span class="badge badge-primary">${application.status || 'Payment Received'}</span></td>
      </tr>
    </table>

    <div style="margin-top: 24px; text-align: center;">
      <a href="https://gb.zoltanvisa.com/admin" class="button" target="_blank">
        Open Admin Portal & Review Case
      </a>
    </div>
  `;

  const html = getBaseEmailLayout(content, `[PAYMENT ALERT] ${currency} ${amount} received from ${applicantName}`);

  return await sendEmail({
    to: getAdminEmail(),
    subject: `[PAYMENT RECEIVED] ${currency} ${amount} - ${applicantName} (App #${application.id})`,
    html,
    replyTo: userData.email || getReplyTo()
  });
};

/**
 * 3. Send Application Submission Confirmation to Applicant
 */
const sendApplicationConfirmationEmail = async ({ application, documents = [] }) => {
  const userData = application.user_data || {};
  const applicantEmail = userData.email;
  const applicantName = userData.fullName || [userData.name, userData.surname].filter(Boolean).join(' ') || 'Valued Client';
  const config = application.visaConfiguration || {};
  const route = `${config.citizenship || userData.citizenship || 'UK'} to ${config.destination || userData.destination || 'Destination'}`;

  const docCount = documents.length;
  const docListHtml = documents.length > 0
    ? `<ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155;">
        ${documents.map(d => `<li><strong>${d.document_type || 'Document'}</strong> &mdash; ${d.file_name || 'Uploaded File'}</li>`).join('')}
       </ul>`
    : `<p style="margin: 0; font-size: 13px; color: #64748b;">No documents uploaded yet. You can upload required files anytime.</p>`;

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-primary">APPLICATION LODGED</span>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 10px 0 4px 0;">We've Received Your Application</h2>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Case Reference: <strong>#${application.id}</strong> &middot; ${route}</p>
    </div>

    <p style="font-size: 14px;">
      Dear <strong>${applicantName}</strong>,<br>
      Thank you for submitting your visa assistance application with Zoltan Visa. Our immigration specialists have received your dossier.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <h3 style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; margin: 0 0 10px 0;">
        Uploaded Documents (${docCount})
      </h3>
      ${docListHtml}
    </div>

    <div class="highlight-box">
      <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1e3a8a;">Immediate Next Milestones</h4>
      <p style="margin: 0; font-size: 12px; color: #334155;">
        1. Our caseworkers check each document against Schengen / Embassy standards.<br>
        2. If any paperwork needs updating, we will notify you right away.<br>
        3. Once all documents and payment are verified, appointment booking commences.
      </p>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      For any urgent requests, reply directly to this email or reach us on WhatsApp.
    </p>
  `;

  const html = getBaseEmailLayout(content, `Application #${application.id} Received - Zoltan Visa`);

  return await sendEmail({
    to: applicantEmail,
    subject: `Application Dossier Received - Zoltan Visa Ref #${application.id}`,
    html,
    replyTo: getReplyTo()
  });
};

/**
 * 4. Send Application Alert to Admin
 */
const sendAdminNewApplicationAlert = async ({ application, documents = [] }) => {
  const userData = application.user_data || {};
  const applicantName = userData.fullName || [userData.name, userData.surname].filter(Boolean).join(' ') || 'Applicant';
  const config = application.visaConfiguration || {};
  const route = `${config.citizenship || userData.citizenship || 'UK'} to ${config.destination || userData.destination || 'Destination'}`;

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-warning">NEW APPLICATION LODGED</span>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 10px 0 4px 0;">New Visa Application Lodged</h2>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Case Ref: <strong>#${application.id}</strong> &middot; Route: <strong>${route}</strong></p>
    </div>

    <table class="table-details" cellpadding="0" cellspacing="0">
      <tr>
        <th width="35%">Applicant</th>
        <td><strong>${applicantName}</strong></td>
      </tr>
      <tr>
        <th>Email</th>
        <td><a href="mailto:${userData.email}">${userData.email || 'N/A'}</a></td>
      </tr>
      <tr>
        <th>Phone</th>
        <td>${userData.phone || userData.phoneLocal || 'N/A'}</td>
      </tr>
      <tr>
        <th>Documents</th>
        <td>${documents.length} document(s) uploaded</td>
      </tr>
      <tr>
        <th>Payment Status</th>
        <td><span class="badge badge-primary">${application.payment_status || 'pending'}</span></td>
      </tr>
    </table>

    <div style="margin-top: 24px; text-align: center;">
      <a href="https://gb.zoltanvisa.com/admin" class="button" target="_blank">
        Review Dossier in Admin
      </a>
    </div>
  `;

  const html = getBaseEmailLayout(content, `[NEW APPLICATION] ${applicantName} - ${route}`);

  return await sendEmail({
    to: getAdminEmail(),
    subject: `[NEW APPLICATION] ${applicantName} - ${route} (Ref #${application.id})`,
    html,
    replyTo: userData.email || getReplyTo()
  });
};

/**
 * 5. Send Inquiry Acknowledgment to Applicant
 */
const sendQueryAcknowledgmentEmail = async ({ queryData }) => {
  const applicantName = queryData.fullName || queryData.name || 'Prospective Traveler';
  const queryType = queryData.queryType || 'Visa Inquiry';

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-primary">INQUIRY RECEIVED</span>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 10px 0 4px 0;">We've Received Your Query</h2>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Category: <strong>${queryType}</strong></p>
    </div>

    <p style="font-size: 14px;">
      Dear <strong>${applicantName}</strong>,<br>
      Thank you for reaching out to Zoltan Visa. One of our dedicated visa specialists is reviewing your inquiry regarding <strong>${queryData.destination || 'your upcoming trip'}</strong>.
    </p>

    <div class="highlight-box">
      <p style="margin: 0 0 6px 0; font-weight: 700; color: #1e3a8a;">Estimated Response Time</p>
      <p style="margin: 0; font-size: 12px; color: #334155;">
        A visa consultant will reach out via <strong>${queryData.preferredContact || 'WhatsApp or Email'}</strong> shortly during business hours.
      </p>
    </div>

    ${queryData.message ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 12px; color: #475569; margin: 16px 0;">
        <strong style="color: #0f172a;">Your Message:</strong><br>
        "${queryData.message}"
      </div>
    ` : ''}

    <p style="font-size: 13px; color: #64748b;">
      Need immediate assistance? Feel free to contact our support team at <a href="mailto:support@zoltanvisa.com">support@zoltanvisa.com</a>.
    </p>
  `;

  const html = getBaseEmailLayout(content, `We've received your query - Zoltan Visa Concierge`);

  return await sendEmail({
    to: queryData.email,
    subject: `We've received your query - Zoltan Visa Concierge`,
    html,
    replyTo: getReplyTo()
  });
};

/**
 * 6. Send Inquiry Lead Alert to Admin (support@zoltanvisa.com)
 */
const sendAdminQueryAlert = async ({ queryData }) => {
  const applicantName = queryData.fullName || [queryData.name, queryData.surname].filter(Boolean).join(' ') || 'Prospective Client';
  const queryType = queryData.queryType || 'Visa Inquiry';

  // Format dynamic answers if present
  let answersHtml = '';
  if (queryData.queryAnswers && typeof queryData.queryAnswers === 'object') {
    const keys = Object.keys(queryData.queryAnswers);
    if (keys.length > 0) {
      answersHtml = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 12px;">
          <p style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 6px 0;">Form Responses</p>
          ${keys.map(k => `<p style="margin: 0 0 4px 0; font-size: 12px;"><strong>${k}:</strong> ${queryData.queryAnswers[k]}</p>`).join('')}
        </div>
      `;
    }
  }

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-warning">&bull; NEW LEAD / INQUIRY</span>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 10px 0 4px 0;">New Visa Inquiry Submitted</h2>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Source: ${queryData.source || 'Website Query Form'} &middot; Type: <strong>${queryType}</strong></p>
    </div>

    <table class="table-details" cellpadding="0" cellspacing="0">
      <tr>
        <th width="35%">Full Name</th>
        <td><strong>${applicantName}</strong></td>
      </tr>
      <tr>
        <th>Email</th>
        <td><a href="mailto:${queryData.email}">${queryData.email || 'N/A'}</a></td>
      </tr>
      <tr>
        <th>Phone</th>
        <td>${queryData.phone || queryData.phoneLocal || 'N/A'}</td>
      </tr>
      <tr>
        <th>Preferred Contact</th>
        <td><strong style="color: #2563eb;">${queryData.preferredContact || 'WhatsApp'}</strong></td>
      </tr>
      <tr>
        <th>Citizenship &rarr; Destination</th>
        <td>${queryData.citizenship || 'N/A'} &rarr; ${queryData.destination || 'N/A'}</td>
      </tr>
      ${queryData.message ? `
      <tr>
        <th>Applicant Message</th>
        <td>${queryData.message}</td>
      </tr>
      ` : ''}
    </table>

    ${answersHtml}

    <!-- Instant Reach-out CTAs -->
    <div style="margin-top: 24px; text-align: center;">
      ${queryData.phone ? `
        <a href="https://wa.me/${queryData.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${applicantName}, this is Zoltan Visa regarding your inquiry for ${queryData.destination || 'your visa'}.`)}" class="button" style="background-color: #059669; margin-right: 8px;" target="_blank">
          Reach via WhatsApp
        </a>
      ` : ''}
      <a href="mailto:${queryData.email}?subject=${encodeURIComponent(`Zoltan Visa - Regarding Your Inquiry`)}" class="button" style="background-color: #2563eb;" target="_blank">
        Reply via Email
      </a>
    </div>
  `;

  const html = getBaseEmailLayout(content, `[NEW LEAD] ${applicantName} - ${queryType}`);

  return await sendEmail({
    to: getAdminEmail(),
    subject: `[NEW INQUIRY] ${applicantName} - ${queryType}`,
    html,
    replyTo: queryData.email || getReplyTo()
  });
};

/**
 * 7. Send Status Update Email to Applicant
 */
const sendStatusUpdateEmail = async ({ application, newStatus, notes = '' }) => {
  const userData = application.user_data || {};
  const applicantEmail = userData.email;
  const applicantName = userData.fullName || [userData.name, userData.surname].filter(Boolean).join(' ') || 'Valued Client';
  const config = application.visaConfiguration || {};
  const route = `${config.citizenship || userData.citizenship || 'UK'} to ${config.destination || userData.destination || 'Destination'}`;

  // Choose badge color based on status
  let badgeClass = 'badge-primary';
  if (['Process Completed', 'Approved', 'Payment Received'].includes(newStatus)) {
    badgeClass = 'badge-success';
  } else if (['Documents Pending', 'Payment Pending', 'In Review'].includes(newStatus)) {
    badgeClass = 'badge-warning';
  }

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge ${badgeClass}">${newStatus}</span>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 10px 0 4px 0;">Application Status Update</h2>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Case Ref: <strong>#${application.id}</strong> &middot; ${route}</p>
    </div>

    <p style="font-size: 14px;">
      Dear <strong>${applicantName}</strong>,<br>
      The status of your visa assistance case has been updated to: <strong style="font-size: 15px; color: #0f172a;">${newStatus}</strong>.
    </p>

    ${notes ? `
      <div class="highlight-box" style="border-left-color: #2563eb;">
        <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #1e3a8a;">Caseworker Notes:</h4>
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">${notes}</p>
      </div>
    ` : ''}

    <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
      If any action is required from your side or if you have questions, please reply directly to this email or reach us on WhatsApp.
    </p>
  `;

  const html = getBaseEmailLayout(content, `Status Update: Application #${application.id} is now ${newStatus}`);

  return await sendEmail({
    to: applicantEmail,
    subject: `Status Update: Your Visa Application #${application.id} is now ${newStatus}`,
    html,
    replyTo: getReplyTo()
  });
};

/**
 * 8. Send Test Email for Diagnostics
 */
const sendTestEmail = async (targetEmail) => {
  const recipient = targetEmail || getAdminEmail();
  const timestamp = new Date().toLocaleString();

  const content = `
    <div style="margin-bottom: 20px;">
      <span class="badge badge-success">SMTP SYSTEM TEST</span>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 10px 0 4px 0;">ZeptoMail SMTP Test Email</h2>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Sent at: ${timestamp}</p>
    </div>

    <p style="font-size: 14px;">
      This is a test email sent from your Zoltan Visa backend via <strong>smtp.zeptomail.in:587</strong>.
    </p>

    <div class="highlight-box">
      <p style="margin: 0; font-size: 13px; color: #334155;">
        <strong>Configuration Details:</strong><br>
        &bull; Host: ${process.env.SMTP_HOST || 'smtp.zeptomail.in'}<br>
        &bull; Port: ${process.env.SMTP_PORT || '587'}<br>
        &bull; From: ${getSender()}<br>
        &bull; Reply-To: ${getReplyTo()}<br>
        &bull; Admin Email: ${getAdminEmail()}
      </p>
    </div>

    <p style="font-size: 13px; color: #15803d; font-weight: 700;">
      &check; If you received this email, your ZeptoMail credentials and transport are working properly!
    </p>
  `;

  const html = getBaseEmailLayout(content, `ZeptoMail SMTP Test Email from Zoltan Visa`);

  return await sendEmail({
    to: recipient,
    subject: `Test Email from Zoltan Visa SMTP (ZeptoMail)`,
    html,
    replyTo: getReplyTo()
  });
};

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  sendAdminPaymentAlert,
  sendApplicationConfirmationEmail,
  sendAdminNewApplicationAlert,
  sendQueryAcknowledgmentEmail,
  sendAdminQueryAlert,
  sendStatusUpdateEmail,
  sendTestEmail
};
