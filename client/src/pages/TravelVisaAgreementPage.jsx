import React from 'react';
import { Link } from 'react-router-dom';
import { 
  AGREEMENT_TITLE, 
  AGREEMENT_SUBTITLE, 
  AGREEMENT_PREAMBLE, 
  AGREEMENT_SECTIONS, 
  CLIENT_DECLARATIONS, 
  IMPORTANT_NOTE 
} from '../data/travelVisaAgreementData';

const TravelVisaAgreementPage = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen text-on-surface py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <span>/</span>
              <span className="text-primary font-semibold">Legal</span>
              <span>/</span>
              <span>Visa Assistance Agreement</span>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
              {AGREEMENT_TITLE}
            </h1>
            <p className="text-sm sm:text-base text-primary font-semibold mt-1">
              {AGREEMENT_SUBTITLE}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              type="button"
              className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface font-semibold text-xs hover:bg-surface-container-low transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">print</span>
              Print / Save PDF
            </button>
            <Link
              to="/apply"
              className="px-5 py-2.5 rounded-full bg-primary text-white font-bold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5"
            >
              <span>Apply Now</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Quick Highlights Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-outline-variant/30 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-xl">schedule</span>
            </div>
            <h2 className="font-bold text-sm text-on-surface">35-Day Timeline</h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Standard 35-day internal processing + 10-day grace period.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-outline-variant/30 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-xl">gavel</span>
            </div>
            <h2 className="font-bold text-sm text-on-surface">No Visa Guarantee</h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Decisions rest solely with embassies and immigration authorities.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-outline-variant/30 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <h2 className="font-bold text-sm text-on-surface">Authentic Documents</h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Applicant is responsible for providing 100% genuine documents.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-outline-variant/30 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-xl">account_balance</span>
            </div>
            <h2 className="font-bold text-sm text-on-surface">Third-Party Fees</h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Government and embassy fees are separate from service charges.
            </p>
          </div>
        </div>

        {/* Full Agreement Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-outline-variant/30 shadow-sm space-y-8">
          
          {/* Preamble */}
          <div className="p-6 rounded-2xl bg-surface-container-lowest border-l-4 border-primary text-sm sm:text-base leading-relaxed italic text-on-surface/90">
            {AGREEMENT_PREAMBLE}
          </div>

          {/* 19 Clauses */}
          <div className="space-y-8">
            {AGREEMENT_SECTIONS.map((section) => (
              <div key={section.id} className="space-y-3">
                <h2 className="font-headline font-bold text-lg text-primary border-b border-outline-variant/20 pb-1.5">
                  {section.title}
                </h2>
                <div className="space-y-3 text-sm text-on-surface/85 leading-relaxed">
                  {section.clauses.map((clause, cIdx) => (
                    <div key={cIdx} className="space-y-1.5">
                      <p className="font-medium">
                        {clause.number !== '7.0' && (
                          <span className="font-bold text-on-surface mr-2">{clause.number}</span>
                        )}
                        {clause.text}
                      </p>
                      {clause.bullets && (
                        <ul className="list-disc list-inside space-y-1 pl-4 text-on-surface-variant">
                          {clause.bullets.map((bullet, bIdx) => (
                            <li key={bIdx}>{bullet}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Client Declaration & Acceptance */}
          <div className="p-6 sm:p-8 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
              <h2 className="font-headline font-bold text-lg uppercase tracking-wide">
                CLIENT DECLARATION & ACCEPTANCE
              </h2>
            </div>
            <p className="font-semibold text-sm text-on-surface">
              By accepting this Agreement (including electronic acceptance, ticking an acceptance box, making payment, or instructing work), the Client confirms:
            </p>
            <ul className="space-y-2.5 text-xs sm:text-sm text-on-surface/90">
              {CLIENT_DECLARATIONS.map((dec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">
                    check_circle
                  </span>
                  <span>{dec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer Note */}
          <div className="p-5 rounded-2xl bg-surface-container-lowest text-center text-xs sm:text-sm text-on-surface-variant border border-outline-variant/30 space-y-1">
            <p className="font-bold text-on-surface">Zoltan • Your International Partner</p>
            <p>{IMPORTANT_NOTE}</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-4">
          <Link
            to="/apply"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary/90 hover:-translate-y-0.5 transition-all"
          >
            <span>Proceed to Visa Application</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default TravelVisaAgreementPage;
