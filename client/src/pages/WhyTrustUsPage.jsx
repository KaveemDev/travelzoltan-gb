import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trustAPI } from '../services/api';

const WhyTrustUsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [videoTestimonials, setVideoTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocModal, setSelectedDocModal] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  // Official Documents Data
  const officialDocuments = [
    {
      id: 'incorporation',
      title: 'Certificate of Incorporation',
      subtitle: 'Registrar of Companies (UK Companies House)',
      category: 'Official Government Incorporation',
      badge: 'UK Incorporated',
      description: 'Official Certificate of Incorporation issued under the Companies Act, certifying Zoltan as a legally incorporated, fully compliant entity operating under United Kingdom jurisdiction.',
      pdfUrl: '/documents/certificate-of-incorporation.pdf',
      previewImage: '/documents/certificate-of-incorporation-preview.png',
      highlights: [
        'Legally registered UK Company',
        'Subject to UK consumer protection & regulatory governance',
        'Official corporate entity for travel and visa consultancy'
      ]
    },
    {
      id: 'brit-agent',
      title: 'Certified BRIT Agent',
      subtitle: 'British Council & UK Education / Travel Accreditation',
      category: 'Professional Accreditation',
      badge: 'Certified Agent',
      description: 'Official British Agent credential recognizing professional training, vetted ethical practice, and rigorous standards in UK & international travel and visa advisory services.',
      pdfUrl: '/documents/certified-brit-agent.pdf',
      previewImage: '/documents/certified-brit-agent-preview.png',
      highlights: [
        'Vetted by official British training standards',
        'Highest compliance with visa application advisory protocols',
        'Recognized industry credential for global travel counseling'
      ]
    }
  ];

  // Fetch reviews and video testimonials from backend
  useEffect(() => {
    const fetchTrustData = async () => {
      try {
        setLoading(true);
        const data = await trustAPI.getPublicTrustContent();
        if (data) {
          setReviews(data.reviews || []);
          setVideoTestimonials(data.videoTestimonials || []);
        }
      } catch (err) {
        console.warn('[WhyTrustUsPage] Could not load trust content:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustData();
  }, []);

  // Format video embed URL safely
  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    return url;
  };

  return (
    <main className="pt-24 min-h-screen bg-slate-50/50">
      {/* Hero Section */}
      <section className="relative py-20 px-6 md:px-12 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white overflow-hidden">
        {/* Subtle Ambient Backdrops */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-primary-light shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Verified Accreditations & Transparency
          </div>

          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Why Trust{' '}
            <span className="bg-gradient-to-r from-primary via-rose-400 to-amber-300 text-transparent bg-clip-text">
              Zoltan Visas?
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-slate-300 text-base sm:text-lg leading-relaxed">
            We understand that your passport, travel dreams, and visa applications require 100% confidence.
            Here is our official proof of incorporation, British accreditations, and genuine customer feedback.
          </p>

          {/* Key Trust Counters */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <p className="text-3xl font-extrabold text-primary-light">20+ Yrs</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Group Experience</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <p className="text-3xl font-extrabold text-emerald-400">99.8%</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Visa Success Rate</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <p className="text-3xl font-extrabold text-sky-400">UK Registered</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Companies House</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <p className="text-3xl font-extrabold text-amber-400">BRIT Certified</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Accredited Agent</p>
            </div>
          </div>
        </div>
      </section>

      {/* Official Documents Section */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            Legal Credentials
          </div>
          <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Our Official Company Documents
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Inspect our official government incorporation certificate and accredited BRIT agent credentials. You can view high-resolution previews or download the authentic legal documents directly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {officialDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg shadow-slate-100 hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Header & Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {doc.badge}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-primary">policy</span>
                    {doc.category}
                  </span>
                </div>

                <h3 className="font-headline text-2xl font-bold text-slate-900 mb-1">
                  {doc.title}
                </h3>
                <p className="text-xs font-medium text-primary mb-4">
                  {doc.subtitle}
                </p>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {doc.description}
                </p>

                {/* Document Thumbnail Preview Card */}
                <div
                  onClick={() => setSelectedDocModal(doc)}
                  className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group/thumb shadow-sm hover:shadow-md transition-all mb-6 aspect-[4/3] flex items-center justify-center"
                >
                  <img
                    src={doc.previewImage}
                    alt={doc.title}
                    className="w-full h-full object-contain p-2 group-hover/thumb:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-xs">
                    <span className="material-symbols-outlined text-lg">zoom_in</span>
                    <span>Click to View Full Document</span>
                  </div>
                </div>

                {/* Key Verification Highlights */}
                <div className="space-y-2 mb-6">
                  {doc.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <span className="material-symbols-outlined text-emerald-600 text-sm shrink-0 mt-0.5">check_circle</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setSelectedDocModal(doc)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-headline font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  View Full Document
                </button>
                <a
                  href={doc.pdfUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-headline font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-primary/20"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download Official PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Video Testimonials Section - Rendered ONLY if items exist from backend */}
      {videoTestimonials && videoTestimonials.length > 0 && (
        <section className="py-20 px-6 md:px-12 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs uppercase tracking-wider border border-rose-200">
                <span className="material-symbols-outlined text-sm">play_circle</span>
                Client Stories
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Watch Our Clients' Video Testimonials
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Real travelers sharing their real experiences getting their Schengen, UK, US, and global visas through Zoltan Visa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoTestimonials.map((vid) => (
                <div
                  key={vid.id}
                  className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        {vid.destination}
                      </span>
                      {vid.duration && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {vid.duration}
                        </span>
                      )}
                    </div>
                    <h4 className="font-headline font-bold text-base text-slate-900 mb-1">
                      {vid.title || `${vid.customer_name}'s Visa Journey`}
                    </h4>
                    {vid.quote && (
                      <p className="text-xs text-slate-600 italic line-clamp-2 mb-4">
                        "{vid.quote}"
                      </p>
                    )}
                  </div>

                  {/* Video Thumbnail / Trigger */}
                  <div
                    onClick={() => setActiveVideoModal(vid)}
                    className="relative bg-slate-900 aspect-video flex items-center justify-center cursor-pointer group overflow-hidden"
                  >
                    {vid.thumbnail_url ? (
                      <img
                        src={vid.thumbnail_url}
                        alt={vid.customer_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center" />
                    )}
                    <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/20 transition-colors" />
                    <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform relative z-10">
                      <span className="material-symbols-outlined text-3xl ml-0.5">play_arrow</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{vid.customer_name}</p>
                      <p className="text-[10px] text-slate-500">Verified Visa Applicant</p>
                    </div>
                    <button
                      onClick={() => setActiveVideoModal(vid)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Watch Video
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Customer Reviews Section - Rendered ONLY if items exist from backend */}
      {reviews && reviews.length > 0 && (
        <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs uppercase tracking-wider border border-amber-200">
              <span className="material-symbols-outlined text-sm text-amber-500">star</span>
              Client Endorsements
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Customer Reviews & Ratings
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Read transparent feedback from applicants whom we have guided from initial checklist review to visa stamp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Rating Stars */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-base"
                          style={{ fontVariationSettings: `'FILL' ${i < (rev.rating || 5) ? 1 : 0}` }}
                        >
                          star
                        </span>
                      ))}
                    </div>
                    {rev.verified && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        Verified Customer
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4">
                    "{rev.review_text}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{rev.customer_name}</p>
                    <p className="text-[11px] text-slate-500">{rev.destination}</p>
                  </div>
                  {rev.review_date && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {rev.review_date}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The 5 Zoltan Trust Standards Strip */}
      <section className="py-20 px-6 md:px-12 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight">
              Our 5 Pillars of Visa Excellence
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Why thousands of travelers entrust their overseas journeys to our legal team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: 'gavel', title: '100% Embassy Compliant', desc: 'Every application is audited against up-to-date consular protocols before filing.' },
              { icon: 'calendar_month', title: 'Priority Appointments', desc: 'We monitor official consulate slots daily to secure the earliest biometric dates.' },
              { icon: 'support_agent', title: 'Dedicated Legal Officer', desc: 'You receive a senior dedicated case manager who coordinates every stage with you.' },
              { icon: 'lock', title: 'Bank-Grade Security', desc: '256-bit SSL encryption and strict GDPR compliance for confidential identity documents.' },
              { icon: 'flight_takeoff', title: 'End-to-End Itineraries', desc: 'Official flight reservations and hotel vouchers supplied to meet embassy standards.' }
            ].map((pillar, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary-light flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-2xl">{pillar.icon}</span>
                  </div>
                  <h4 className="font-headline font-bold text-sm mb-2">{pillar.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Strip */}
      <section className="py-16 px-6 md:px-12 bg-white text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="font-headline text-3xl font-extrabold text-slate-900 tracking-tight">
            Ready to Plan Your Journey with Full Confidence?
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            Select your destination to view the streamlined checklist, check available appointment dates, or chat directly with our British visa consultants.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/checklist"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold text-xs shadow-md shadow-primary/25 hover:shadow-lg transition-all"
            >
              Check Visa Requirements & Slots
            </Link>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-whatsapp-dialog'))}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              Chat with Case Officer
            </button>
            <a
              href="https://www.instagram.com/travelzoltan/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-headline font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-pink-600/20"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Document View Modal */}
      {selectedDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-dialog-appear">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-light">
                  {selectedDocModal.category}
                </span>
                <h3 className="font-headline font-bold text-lg sm:text-xl">
                  {selectedDocModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDocModal(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Content - High-Res Preview */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center bg-slate-100">
              <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 max-w-2xl w-full">
                <img
                  src={selectedDocModal.previewImage}
                  alt={selectedDocModal.title}
                  className="w-full h-auto object-contain rounded-xl"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Official document verification • Zoltan Visa Group UK
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <a
                  href={selectedDocModal.pdfUrl}
                  download
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download PDF
                </a>
                <button
                  onClick={() => setSelectedDocModal(null)}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal Player */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-dialog-appear">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <p className="text-xs text-primary-light font-bold">{activeVideoModal.destination}</p>
                <h4 className="font-headline font-bold text-base text-white">{activeVideoModal.customer_name}</h4>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {activeVideoModal.video_url.includes('youtube') || activeVideoModal.video_url.includes('youtu.be') || activeVideoModal.video_url.includes('vimeo') ? (
                <iframe
                  src={getEmbedUrl(activeVideoModal.video_url)}
                  title={activeVideoModal.customer_name}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <video
                  src={activeVideoModal.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default WhyTrustUsPage;
