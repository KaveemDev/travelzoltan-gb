import React, { useState, useEffect } from 'react';
import { trustAPI } from '../services/api';

const TrustReviewsTab = ({ showNotification }) => {
  const [activeSubTab, setActiveSubTab] = useState('reviews'); // 'reviews' | 'videos' | 'appointments'
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [videoTestimonials, setVideoTestimonials] = useState([]);
  const [appointmentSlots, setAppointmentSlots] = useState([]);

  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    customer_name: '',
    destination: '',
    rating: 5,
    review_text: '',
    review_date: '',
    verified: true,
    is_active: true
  });

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({
    customer_name: '',
    destination: '',
    title: '',
    quote: '',
    video_url: '',
    thumbnail_url: '',
    duration: '',
    is_active: true
  });

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    destination: '',
    consular_city: 'London',
    center_name: '',
    earliest_date: '',
    appointment_type: 'Standard',
    slots_status: 'Available',
    is_active: true
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await trustAPI.getAdminTrustContent();
      if (data) {
        setReviews(data.reviews || []);
        setVideoTestimonials(data.videoTestimonials || []);
        setAppointmentSlots(data.appointmentSlots || []);
      }
    } catch (error) {
      console.error('Error loading trust content in admin:', error);
      showNotification?.('Failed to load trust content', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Review Handlers
  const handleOpenReviewModal = (rev = null) => {
    if (rev) {
      setEditingReview(rev);
      setReviewForm({
        customer_name: rev.customer_name || '',
        destination: rev.destination || '',
        rating: rev.rating || 5,
        review_text: rev.review_text || '',
        review_date: rev.review_date || '',
        verified: rev.verified !== false,
        is_active: rev.is_active !== false
      });
    } else {
      setEditingReview(null);
      setReviewForm({
        customer_name: '',
        destination: 'Europe (Schengen)',
        rating: 5,
        review_text: '',
        review_date: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        verified: true,
        is_active: true
      });
    }
    setShowReviewModal(true);
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.customer_name.trim() || !reviewForm.review_text.trim()) {
      showNotification?.('Customer name and review text are required', 'error');
      return;
    }

    try {
      if (editingReview) {
        await trustAPI.updateReview(editingReview.id, reviewForm);
        showNotification?.('Review updated successfully', 'success');
      } else {
        await trustAPI.createReview(reviewForm);
        showNotification?.('Review created successfully', 'success');
      }
      setShowReviewModal(false);
      loadData();
    } catch (err) {
      showNotification?.(err.message || 'Error saving review', 'error');
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await trustAPI.deleteReview(id);
      showNotification?.('Review deleted successfully', 'success');
      loadData();
    } catch (err) {
      showNotification?.(err.message || 'Error deleting review', 'error');
    }
  };

  const handleToggleReviewActive = async (rev) => {
    try {
      await trustAPI.updateReview(rev.id, { is_active: !rev.is_active });
      loadData();
    } catch (err) {
      showNotification?.(err.message || 'Error toggling review status', 'error');
    }
  };

  // Video Handlers
  const handleOpenVideoModal = (vid = null) => {
    if (vid) {
      setEditingVideo(vid);
      setVideoForm({
        customer_name: vid.customer_name || '',
        destination: vid.destination || '',
        title: vid.title || '',
        quote: vid.quote || '',
        video_url: vid.video_url || '',
        thumbnail_url: vid.thumbnail_url || '',
        duration: vid.duration || '',
        is_active: vid.is_active !== false
      });
    } else {
      setEditingVideo(null);
      setVideoForm({
        customer_name: '',
        destination: 'Europe (Schengen)',
        title: '',
        quote: '',
        video_url: '',
        thumbnail_url: '',
        duration: '',
        is_active: true
      });
    }
    setShowVideoModal(true);
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    if (!videoForm.customer_name.trim() || !videoForm.video_url.trim()) {
      showNotification?.('Customer name and video URL are required', 'error');
      return;
    }

    try {
      if (editingVideo) {
        await trustAPI.updateVideoTestimonial(editingVideo.id, videoForm);
        showNotification?.('Video testimonial updated', 'success');
      } else {
        await trustAPI.createVideoTestimonial(videoForm);
        showNotification?.('Video testimonial added', 'success');
      }
      setShowVideoModal(false);
      loadData();
    } catch (err) {
      showNotification?.(err.message || 'Error saving video', 'error');
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      await trustAPI.deleteVideoTestimonial(id);
      showNotification?.('Video deleted successfully', 'success');
      loadData();
    } catch (err) {
      showNotification?.(err.message || 'Error deleting video', 'error');
    }
  };

  const handleToggleVideoActive = async (vid) => {
    try {
      await trustAPI.updateVideoTestimonial(vid.id, { is_active: !vid.is_active });
      loadData();
    } catch (err) {
      showNotification?.(err.message || 'Error toggling video status', 'error');
    }
  };

  // Appointment Slots Handlers
  const handleOpenSlotModal = (slot = null) => {
    if (slot) {
      setEditingSlot(slot);
      setSlotForm({
        destination: slot.destination || '',
        consular_city: slot.consular_city || 'London',
        center_name: slot.center_name || '',
        earliest_date: slot.earliest_date || '',
        appointment_type: slot.appointment_type || 'Standard',
        slots_status: slot.slots_status || 'Available',
        is_active: slot.is_active !== false
      });
    } else {
      setEditingSlot(null);
      setSlotForm({
        destination: 'France (Schengen)',
        consular_city: 'London',
        center_name: 'TLScontact London',
        earliest_date: '14 Oct 2026',
        appointment_type: 'Express Available',
        slots_status: 'Available',
        is_active: true
      });
    }
    setShowSlotModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!slotForm.destination.trim() || !slotForm.earliest_date.trim()) {
      showNotification?.('Destination and earliest date are required', 'error');
      return;
    }

    try {
      if (editingSlot) {
        await trustAPI.updateAppointmentSlot(editingSlot.id, slotForm);
        showNotification?.('Appointment slot updated', 'success');
      } else {
        await trustAPI.createAppointmentSlot(slotForm);
        showNotification?.('Appointment slot created', 'success');
      }
      setShowSlotModal(false);
      loadData();
    } catch (err) {
      showNotification?.(err.message || 'Error saving slot', 'error');
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Are you sure you want to delete this appointment slot?')) return;
    try {
      await trustAPI.deleteAppointmentSlot(id);
      showNotification?.('Slot deleted successfully', 'success');
      loadData();
    } catch (err) {
      showNotification?.(err.message || 'Error deleting slot', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('reviews')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'reviews'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">reviews</span>
            Customer Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveSubTab('videos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'videos'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">smart_display</span>
            Video Testimonials ({videoTestimonials.length})
          </button>
          <button
            onClick={() => setActiveSubTab('appointments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'appointments'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            Appointment Dates ({appointmentSlots.length})
          </button>
        </div>

        <div>
          {activeSubTab === 'reviews' && (
            <button
              onClick={() => handleOpenReviewModal()}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Customer Review
            </button>
          )}
          {activeSubTab === 'videos' && (
            <button
              onClick={() => handleOpenVideoModal()}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Video Testimonial
            </button>
          )}
          {activeSubTab === 'appointments' && (
            <button
              onClick={() => handleOpenSlotModal()}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Appointment Slot
            </button>
          )}
        </div>
      </div>

      {/* Info notice about conditional rendering */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-center gap-3">
        <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">info</span>
        <span>
          <strong>Live Visibility Rule:</strong> The "Customer Reviews" and "Video Testimonials" sections on the public <em>"Why Trust Zoltan Visas?"</em> page will automatically hide if there are 0 active entries. You can add, edit, or toggle items here at any time.
        </span>
      </div>

      {/* REVIEWS SUB-TAB */}
      {activeSubTab === 'reviews' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {reviews.length === 0 ? (
            <div className="text-center py-16 px-4">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">rate_review</span>
              <h4 className="font-bold text-sm text-slate-800">No Customer Reviews Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                When you add customer reviews, they will immediately appear on the "Why Trust Zoltan Visas?" page.
              </p>
              <button
                onClick={() => handleOpenReviewModal()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
              >
                Add First Review
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Destination</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Review Preview</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        {rev.customer_name}
                        {rev.verified && (
                          <span className="ml-1 text-[10px] text-emerald-600 font-normal">✓ Verified</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">{rev.destination}</td>
                      <td className="p-4">
                        <span className="font-bold text-amber-500">★ {rev.rating || 5}</span>
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs truncate">
                        "{rev.review_text}"
                      </td>
                      <td className="p-4 text-slate-500">{rev.review_date || '—'}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleReviewActive(rev)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                            rev.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {rev.is_active !== false ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenReviewModal(rev)}
                          className="text-primary hover:underline font-bold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="text-red-600 hover:underline font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIDEOS SUB-TAB */}
      {activeSubTab === 'videos' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {videoTestimonials.length === 0 ? (
            <div className="text-center py-16 px-4">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">video_library</span>
              <h4 className="font-bold text-sm text-slate-800">No Video Testimonials Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Add YouTube, Vimeo, or MP4 video links of your clients sharing their visa approval stories.
              </p>
              <button
                onClick={() => handleOpenVideoModal()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
              >
                Add Video Testimonial
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Destination</th>
                    <th className="p-4">Title / Quote</th>
                    <th className="p-4">Video Link</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {videoTestimonials.map((vid) => (
                    <tr key={vid.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{vid.customer_name}</td>
                      <td className="p-4 text-slate-600">{vid.destination}</td>
                      <td className="p-4 text-slate-700 max-w-xs truncate">
                        {vid.title || vid.quote || '—'}
                      </td>
                      <td className="p-4 text-slate-500 max-w-xs truncate">
                        <a href={vid.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {vid.video_url}
                        </a>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleVideoActive(vid)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                            vid.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {vid.is_active !== false ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenVideoModal(vid)}
                          className="text-primary hover:underline font-bold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(vid.id)}
                          className="text-red-600 hover:underline font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* APPOINTMENT SLOTS SUB-TAB */}
      {activeSubTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Live Consular Appointment Dates (Displayed on Home & Checklist Pages)
            </span>
            <button
              onClick={() => handleOpenSlotModal()}
              className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
            >
              + Add Slot
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Destination</th>
                  <th className="p-4">City / Center</th>
                  <th className="p-4">Earliest Date</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status Tag</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointmentSlots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{slot.destination}</td>
                    <td className="p-4 text-slate-600">{slot.consular_city} ({slot.center_name || 'VFS / TLS'})</td>
                    <td className="p-4 font-bold text-emerald-700">{slot.earliest_date}</td>
                    <td className="p-4 text-slate-600">{slot.appointment_type || 'Standard'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        {slot.slots_status || 'Available'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenSlotModal(slot)}
                        className="text-primary hover:underline font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-red-600 hover:underline font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-headline font-bold text-lg text-slate-900 mb-4">
              {editingReview ? 'Edit Customer Review' : 'Add Customer Review'}
            </h3>
            <form onSubmit={handleSaveReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={reviewForm.customer_name}
                  onChange={(e) => setReviewForm({ ...reviewForm, customer_name: e.target.value })}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    value={reviewForm.destination}
                    onChange={(e) => setReviewForm({ ...reviewForm, destination: e.target.value })}
                    placeholder="e.g. France (Schengen)"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rating</label>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                    <option value={3}>⭐⭐⭐ (3 Stars)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Review Text *</label>
                <textarea
                  rows="4"
                  required
                  value={reviewForm.review_text}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })}
                  placeholder="Write the customer's review feedback..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Review Date</label>
                  <input
                    type="text"
                    value={reviewForm.review_date}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })}
                    placeholder="e.g. Oct 2026"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={reviewForm.verified}
                      onChange={(e) => setReviewForm({ ...reviewForm, verified: e.target.checked })}
                      className="accent-primary"
                    />
                    Verified
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={reviewForm.is_active}
                      onChange={(e) => setReviewForm({ ...reviewForm, is_active: e.target.checked })}
                      className="accent-primary"
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
                >
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-headline font-bold text-lg text-slate-900 mb-4">
              {editingVideo ? 'Edit Video Testimonial' : 'Add Video Testimonial'}
            </h3>
            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={videoForm.customer_name}
                  onChange={(e) => setVideoForm({ ...videoForm, customer_name: e.target.value })}
                  placeholder="e.g. David & Claire"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination</label>
                <input
                  type="text"
                  value={videoForm.destination}
                  onChange={(e) => setVideoForm({ ...videoForm, destination: e.target.value })}
                  placeholder="e.g. Switzerland Visa"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Video URL (YouTube/Vimeo/Direct MP4) *</label>
                <input
                  type="url"
                  required
                  value={videoForm.video_url}
                  onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title or Short Quote</label>
                <input
                  type="text"
                  value={videoForm.quote}
                  onChange={(e) => setVideoForm({ ...videoForm, quote: e.target.value })}
                  placeholder="e.g. 'Got our Schengen visa in 48 hours without stress!'"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
                >
                  Save Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-headline font-bold text-lg text-slate-900 mb-4">
              {editingSlot ? 'Edit Appointment Slot' : 'Add Appointment Slot'}
            </h3>
            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination *</label>
                <input
                  type="text"
                  required
                  value={slotForm.destination}
                  onChange={(e) => setSlotForm({ ...slotForm, destination: e.target.value })}
                  placeholder="e.g. France (Schengen)"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Consular City</label>
                  <input
                    type="text"
                    value={slotForm.consular_city}
                    onChange={(e) => setSlotForm({ ...slotForm, consular_city: e.target.value })}
                    placeholder="e.g. London"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Center Name</label>
                  <input
                    type="text"
                    value={slotForm.center_name}
                    onChange={(e) => setSlotForm({ ...slotForm, center_name: e.target.value })}
                    placeholder="e.g. TLScontact London"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Earliest Date *</label>
                  <input
                    type="text"
                    required
                    value={slotForm.earliest_date}
                    onChange={(e) => setSlotForm({ ...slotForm, earliest_date: e.target.value })}
                    placeholder="e.g. 14 Oct 2026"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Slot Status Tag</label>
                  <input
                    type="text"
                    value={slotForm.slots_status}
                    onChange={(e) => setSlotForm({ ...slotForm, slots_status: e.target.value })}
                    placeholder="e.g. Express Available"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustReviewsTab;
