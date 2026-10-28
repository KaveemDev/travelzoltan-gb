const fs = require('fs');
const path = require('path');
const { Review, VideoTestimonial, AppointmentSlot, sequelize } = require('../models');

// Fallback JSON file path
const DATA_FILE = path.join(__dirname, '../data/trustContent.json');

// Helper to read fallback data
const readFallbackData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[trustContentController] Error reading fallback file:', e.message);
  }
  return {
    reviews: [],
    videoTestimonials: [],
    appointmentSlots: [
      { id: 1, destination: 'Europe (Schengen States)', consular_city: 'London', center_name: 'TLScontact / VFS Global London', earliest_date: '14 Oct 2026', appointment_type: 'Express / Standard', slots_status: 'Available', is_active: true, sort_order: 1 },
      { id: 2, destination: 'Europe (Schengen States)', consular_city: 'Manchester', center_name: 'VFS Global Manchester', earliest_date: '16 Oct 2026', appointment_type: 'Standard', slots_status: 'Filling Fast (4 slots left)', is_active: true, sort_order: 2 },
      { id: 3, destination: 'France', consular_city: 'London', center_name: 'TLScontact London', earliest_date: '13 Oct 2026', appointment_type: 'Express Slot', slots_status: 'Available', is_active: true, sort_order: 3 },
      { id: 4, destination: 'Spain', consular_city: 'London', center_name: 'BLS International London', earliest_date: '15 Oct 2026', appointment_type: 'Standard', slots_status: 'Available', is_active: true, sort_order: 4 },
      { id: 5, destination: 'Italy', consular_city: 'London', center_name: 'VFS Global London', earliest_date: '18 Oct 2026', appointment_type: 'Priority Slot', slots_status: 'Limited Slots', is_active: true, sort_order: 5 },
      { id: 6, destination: 'Switzerland', consular_city: 'London', center_name: 'TLScontact London', earliest_date: '14 Oct 2026', appointment_type: 'Express Slot', slots_status: 'Available', is_active: true, sort_order: 6 },
      { id: 7, destination: 'United States', consular_city: 'London', center_name: 'US Embassy London', earliest_date: '22 Oct 2026', appointment_type: 'Expedited Appointment', slots_status: 'Priority Slots Open', is_active: true, sort_order: 7 },
      { id: 8, destination: 'Canada', consular_city: 'London', center_name: 'VFS Canada Visa Center', earliest_date: '16 Oct 2026', appointment_type: 'Standard Biometric', slots_status: 'Available', is_active: true, sort_order: 8 }
    ]
  };
};

// Helper to write fallback data
const writeFallbackData = (data) => {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[trustContentController] Error writing fallback file:', e.message);
  }
};

// Ensure database tables exist and sync
let tablesSynced = false;
const ensureTables = async () => {
  if (tablesSynced) return;
  try {
    await Review.sync({ alter: true });
    await VideoTestimonial.sync({ alter: true });
    await AppointmentSlot.sync({ alter: true });
    
    // Seed default appointment slots if empty
    const count = await AppointmentSlot.count();
    if (count === 0) {
      const fallback = readFallbackData();
      if (fallback.appointmentSlots && fallback.appointmentSlots.length > 0) {
        await AppointmentSlot.bulkCreate(
          fallback.appointmentSlots.map(({ id, ...rest }) => rest)
        );
      }
    }
    tablesSynced = true;
  } catch (e) {
    console.warn('[trustContentController] Table sync notice:', e.message);
  }
};

// GET /api/trust-content - Public endpoint
const getPublicTrustContent = async (req, res) => {
  try {
    await ensureTables();
    let reviews = [];
    let videoTestimonials = [];
    let appointmentSlots = [];

    try {
      reviews = await Review.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC'], ['id', 'DESC']]
      });
      videoTestimonials = await VideoTestimonial.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC'], ['id', 'DESC']]
      });
      appointmentSlots = await AppointmentSlot.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
      });
    } catch (dbErr) {
      console.warn('[trustContentController] Falling back to file storage:', dbErr.message);
      const fallback = readFallbackData();
      reviews = (fallback.reviews || []).filter(r => r.is_active !== false);
      videoTestimonials = (fallback.videoTestimonials || []).filter(v => v.is_active !== false);
      appointmentSlots = (fallback.appointmentSlots || []).filter(s => s.is_active !== false);
    }

    return res.status(200).json({
      success: true,
      reviews,
      videoTestimonials,
      appointmentSlots
    });
  } catch (error) {
    console.error('[getPublicTrustContent] Error:', error);
    const fallback = readFallbackData();
    return res.status(200).json({
      success: true,
      reviews: fallback.reviews || [],
      videoTestimonials: fallback.videoTestimonials || [],
      appointmentSlots: fallback.appointmentSlots || []
    });
  }
};

// GET /api/appointment-slots - Public endpoint for appointment dates
const getPublicAppointmentSlots = async (req, res) => {
  try {
    await ensureTables();
    const { destination, citizenship } = req.query;
    let whereClause = { is_active: true };

    let slots = [];
    try {
      slots = await AppointmentSlot.findAll({
        where: whereClause,
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
      });
    } catch (e) {
      const fallback = readFallbackData();
      slots = (fallback.appointmentSlots || []).filter(s => s.is_active !== false);
    }

    if (destination) {
      const destLower = destination.toLowerCase().trim();
      const schengenCountries = [
        'schengen', 'france', 'spain', 'italy', 'germany', 'switzerland', 'austria',
        'netherlands', 'portugal', 'greece', 'denmark', 'sweden', 'norway', 'finland',
        'iceland', 'belgium', 'poland', 'czech', 'hungary', 'estonia', 'latvia', 'lithuania'
      ];
      const isSchengenDest = schengenCountries.some(c => destLower.includes(c));

      slots = slots.filter(s => {
        const slotDest = (s.destination || '').toLowerCase().trim();
        const isSchengenSlot = slotDest.includes('schengen');
        if (slotDest === destLower) return true;
        if (slotDest.includes(destLower) || destLower.includes(slotDest)) return true;
        // Only cross-match if both requested destination and slot are Schengen
        if (isSchengenDest && isSchengenSlot) return true;
        return false;
      });

      // Also check if VisaConfiguration for this destination has custom appointment_data configured
      try {
        const { VisaConfiguration } = require('../models');
        if (VisaConfiguration) {
          const matchingConfigs = await VisaConfiguration.findAll({
            // appointment_data is per citizenship+destination pair; don't leak one pair's slots to others
            where: citizenship
              ? { destination: destination.trim(), citizenship: citizenship.trim() }
              : { destination: destination.trim() }
          });
          const configSlots = [];
          const parseJson = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; } };
          for (const cfg of matchingConfigs) {
            const appData = parseJson(cfg.appointment_data) || parseJson(cfg.form_schema)?.appointment_data;
            // Route toggle is authoritative: disabled means no appointment card, even if general slots match
            if (citizenship && appData && appData.enabled !== true && appData.has_appointment !== true) {
              return res.status(200).json({ success: true, appointmentSlots: [] });
            }
            if (appData && (appData.enabled === true || appData.has_appointment === true)) {
              if (Array.isArray(appData.centers) && appData.centers.length > 0) {
                appData.centers.forEach((c, idx) => {
                  configSlots.push({
                    id: `cfg-${cfg.id}-${idx}`,
                    destination: cfg.destination,
                    consular_city: c.city || appData.location || 'Main Center',
                    center_name: c.center_name || c.center || 'Official Visa Center',
                    earliest_date: c.earliest_date || appData.earliest_date || 'Earliest Available',
                    appointment_type: c.appointment_type || 'Standard',
                    slots_status: c.slots_status || appData.badge_text || 'Available',
                    days_until: c.days_until || appData.days_until,
                    earlier_countries: appData.earlier_countries || []
                  });
                });
              } else if (appData.earliest_date) {
                configSlots.push({
                  id: `cfg-${cfg.id}`,
                  destination: cfg.destination,
                  consular_city: appData.location || 'Main Center',
                  center_name: 'Official Visa Center',
                  earliest_date: appData.earliest_date,
                  appointment_type: 'Standard',
                  slots_status: appData.badge_text || 'Available',
                  days_until: appData.days_until,
                  earlier_countries: appData.earlier_countries || []
                });
              }
            }
          }
          if (configSlots.length > 0) {
            slots = [...configSlots, ...slots];
          }
        }
      } catch (cfgErr) {
        console.warn('[getPublicAppointmentSlots] Error querying config appointment_data:', cfgErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      appointmentSlots: slots
    });
  } catch (error) {
    console.error('[getPublicAppointmentSlots] Error:', error);
    return res.status(200).json({
      success: true,
      appointmentSlots: []
    });
  }
};

// GET /api/admin/trust-content - Admin endpoint
const getAdminTrustContent = async (req, res) => {
  try {
    await ensureTables();
    let reviews = [];
    let videoTestimonials = [];
    let appointmentSlots = [];

    try {
      reviews = await Review.findAll({ order: [['sort_order', 'ASC'], ['id', 'DESC']] });
      videoTestimonials = await VideoTestimonial.findAll({ order: [['sort_order', 'ASC'], ['id', 'DESC']] });
      appointmentSlots = await AppointmentSlot.findAll({ order: [['sort_order', 'ASC'], ['id', 'ASC']] });
    } catch (e) {
      const fallback = readFallbackData();
      reviews = fallback.reviews || [];
      videoTestimonials = fallback.videoTestimonials || [];
      appointmentSlots = fallback.appointmentSlots || [];
    }

    return res.status(200).json({
      success: true,
      reviews,
      videoTestimonials,
      appointmentSlots
    });
  } catch (error) {
    console.error('[getAdminTrustContent] Error:', error);
    const fallback = readFallbackData();
    return res.status(200).json({
      success: true,
      reviews: fallback.reviews || [],
      videoTestimonials: fallback.videoTestimonials || [],
      appointmentSlots: fallback.appointmentSlots || []
    });
  }
};

// CRUD for Reviews
const createReview = async (req, res) => {
  try {
    await ensureTables();
    const { customer_name, destination, citizenship, rating, review_text, review_date, verified, is_active, sort_order } = req.body;
    
    if (!customer_name || !review_text) {
      return res.status(400).json({ success: false, message: 'Customer name and review text are required' });
    }

    let review;
    try {
      review = await Review.create({
        customer_name,
        destination: destination || 'Global Visa',
        citizenship: citizenship || '',
        rating: rating !== undefined ? Number(rating) : 5,
        review_text,
        review_date: review_date || new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        verified: verified !== undefined ? !!verified : true,
        is_active: is_active !== undefined ? !!is_active : true,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0
      });
    } catch (e) {
      // Fallback
      const fallback = readFallbackData();
      review = {
        id: Date.now(),
        customer_name,
        destination: destination || 'Global Visa',
        citizenship: citizenship || '',
        rating: rating !== undefined ? Number(rating) : 5,
        review_text,
        review_date: review_date || new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        verified: verified !== undefined ? !!verified : true,
        is_active: is_active !== undefined ? !!is_active : true,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0
      };
      fallback.reviews = fallback.reviews || [];
      fallback.reviews.unshift(review);
      writeFallbackData(fallback);
    }

    return res.status(201).json({ success: true, review, message: 'Review created successfully' });
  } catch (error) {
    console.error('[createReview] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateReview = async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    let review = await Review.findByPk(id);
    if (review) {
      await review.update(req.body);
    } else {
      const fallback = readFallbackData();
      const idx = (fallback.reviews || []).findIndex(r => String(r.id) === String(id));
      if (idx !== -1) {
        fallback.reviews[idx] = { ...fallback.reviews[idx], ...req.body };
        writeFallbackData(fallback);
        review = fallback.reviews[idx];
      } else {
        return res.status(404).json({ success: false, message: 'Review not found' });
      }
    }
    return res.status(200).json({ success: true, review, message: 'Review updated successfully' });
  } catch (error) {
    console.error('[updateReview] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    let review = await Review.findByPk(id);
    if (review) {
      await review.destroy();
    } else {
      const fallback = readFallbackData();
      fallback.reviews = (fallback.reviews || []).filter(r => String(r.id) !== String(id));
      writeFallbackData(fallback);
    }
    return res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('[deleteReview] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CRUD for Video Testimonials
const createVideoTestimonial = async (req, res) => {
  try {
    await ensureTables();
    const { customer_name, destination, title, quote, video_url, thumbnail_url, duration, is_active, sort_order } = req.body;
    
    if (!customer_name || !video_url) {
      return res.status(400).json({ success: false, message: 'Customer name and video URL are required' });
    }

    let video;
    try {
      video = await VideoTestimonial.create({
        customer_name,
        destination: destination || 'Global Visa',
        title: title || '',
        quote: quote || '',
        video_url,
        thumbnail_url: thumbnail_url || '',
        duration: duration || '',
        is_active: is_active !== undefined ? !!is_active : true,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0
      });
    } catch (e) {
      const fallback = readFallbackData();
      video = {
        id: Date.now(),
        customer_name,
        destination: destination || 'Global Visa',
        title: title || '',
        quote: quote || '',
        video_url,
        thumbnail_url: thumbnail_url || '',
        duration: duration || '',
        is_active: is_active !== undefined ? !!is_active : true,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0
      };
      fallback.videoTestimonials = fallback.videoTestimonials || [];
      fallback.videoTestimonials.unshift(video);
      writeFallbackData(fallback);
    }

    return res.status(201).json({ success: true, video, message: 'Video testimonial added successfully' });
  } catch (error) {
    console.error('[createVideoTestimonial] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateVideoTestimonial = async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    let video = await VideoTestimonial.findByPk(id);
    if (video) {
      await video.update(req.body);
    } else {
      const fallback = readFallbackData();
      const idx = (fallback.videoTestimonials || []).findIndex(v => String(v.id) === String(id));
      if (idx !== -1) {
        fallback.videoTestimonials[idx] = { ...fallback.videoTestimonials[idx], ...req.body };
        writeFallbackData(fallback);
        video = fallback.videoTestimonials[idx];
      } else {
        return res.status(404).json({ success: false, message: 'Video testimonial not found' });
      }
    }
    return res.status(200).json({ success: true, video, message: 'Video updated successfully' });
  } catch (error) {
    console.error('[updateVideoTestimonial] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteVideoTestimonial = async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    let video = await VideoTestimonial.findByPk(id);
    if (video) {
      await video.destroy();
    } else {
      const fallback = readFallbackData();
      fallback.videoTestimonials = (fallback.videoTestimonials || []).filter(v => String(v.id) !== String(id));
      writeFallbackData(fallback);
    }
    return res.status(200).json({ success: true, message: 'Video testimonial deleted successfully' });
  } catch (error) {
    console.error('[deleteVideoTestimonial] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CRUD for Appointment Slots
const createAppointmentSlot = async (req, res) => {
  try {
    await ensureTables();
    const { destination, consular_city, center_name, earliest_date, appointment_type, slots_status, is_active, sort_order } = req.body;
    
    if (!destination || !consular_city || !earliest_date) {
      return res.status(400).json({ success: false, message: 'Destination, consular city, and earliest date are required' });
    }

    let slot;
    try {
      slot = await AppointmentSlot.create({
        destination,
        consular_city,
        center_name: center_name || '',
        earliest_date,
        appointment_type: appointment_type || 'Standard',
        slots_status: slots_status || 'Available',
        is_active: is_active !== undefined ? !!is_active : true,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0
      });
    } catch (e) {
      const fallback = readFallbackData();
      slot = {
        id: Date.now(),
        destination,
        consular_city,
        center_name: center_name || '',
        earliest_date,
        appointment_type: appointment_type || 'Standard',
        slots_status: slots_status || 'Available',
        is_active: is_active !== undefined ? !!is_active : true,
        sort_order: sort_order !== undefined ? Number(sort_order) : 0
      };
      fallback.appointmentSlots = fallback.appointmentSlots || [];
      fallback.appointmentSlots.push(slot);
      writeFallbackData(fallback);
    }

    return res.status(201).json({ success: true, appointmentSlot: slot, message: 'Appointment slot created successfully' });
  } catch (error) {
    console.error('[createAppointmentSlot] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateAppointmentSlot = async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    let slot = await AppointmentSlot.findByPk(id);
    if (slot) {
      await slot.update(req.body);
    } else {
      const fallback = readFallbackData();
      const idx = (fallback.appointmentSlots || []).findIndex(s => String(s.id) === String(id));
      if (idx !== -1) {
        fallback.appointmentSlots[idx] = { ...fallback.appointmentSlots[idx], ...req.body };
        writeFallbackData(fallback);
        slot = fallback.appointmentSlots[idx];
      } else {
        return res.status(404).json({ success: false, message: 'Appointment slot not found' });
      }
    }
    return res.status(200).json({ success: true, appointmentSlot: slot, message: 'Appointment slot updated successfully' });
  } catch (error) {
    console.error('[updateAppointmentSlot] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAppointmentSlot = async (req, res) => {
  try {
    await ensureTables();
    const { id } = req.params;
    let slot = await AppointmentSlot.findByPk(id);
    if (slot) {
      await slot.destroy();
    } else {
      const fallback = readFallbackData();
      fallback.appointmentSlots = (fallback.appointmentSlots || []).filter(s => String(s.id) !== String(id));
      writeFallbackData(fallback);
    }
    return res.status(200).json({ success: true, message: 'Appointment slot deleted successfully' });
  } catch (error) {
    console.error('[deleteAppointmentSlot] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicTrustContent,
  getPublicAppointmentSlots,
  getAdminTrustContent,
  createReview,
  updateReview,
  deleteReview,
  createVideoTestimonial,
  updateVideoTestimonial,
  deleteVideoTestimonial,
  createAppointmentSlot,
  updateAppointmentSlot,
  deleteAppointmentSlot
};
