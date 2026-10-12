import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import TopNavBar from './components/TopNavBar';
import Footer from './components/Footer';
import LiveVisaApprovals from './components/LiveVisaApprovals';
import HomePage from './pages/HomePage';
import ChecklistPage from './pages/ChecklistPage';
import ApplicationProgressPage from './pages/ApplicationProgressPage';
import AdminPage from './pages/AdminPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import PrivacyStatementPage from './pages/PrivacyStatementPage';
import PaymentModePage from './pages/PaymentModePage';
import CancellationRefundPage from './pages/CancellationRefundPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import PaymentTermsPage from './pages/PaymentTermsPage';
import ReservationsBookingsPage from './pages/ReservationsBookingsPage';
import BusBookingTermsPage from './pages/BusBookingTermsPage';
import FlightBookingTermsPage from './pages/FlightBookingTermsPage';
import HotelBookingTermsPage from './pages/HotelBookingTermsPage';
import CarRentalTermsPage from './pages/CarRentalTermsPage';
import HolidaysTermsPage from './pages/HolidaysTermsPage';
import AboutUsPage from './pages/AboutUsPage';
import ContactUsPage from './pages/ContactUsPage';
import TravelVisaAgreementPage from './pages/TravelVisaAgreementPage';
import WhyTrustUsPage from './pages/WhyTrustUsPage';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppContent() {
  const { pathname } = useLocation();
  const isAdminPage = pathname === '/admin';

  return (
    <div className={`min-h-screen flex ${isAdminPage ? '' : 'flex-col'}`}>
      {!isAdminPage && <TopNavBar />}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="/apply" element={<ApplicationProgressPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/privacy-statement" element={<PrivacyStatementPage />} />
          <Route path="/payment-mode" element={<PaymentModePage />} />
          <Route path="/cancellation-refund" element={<CancellationRefundPage />} />
          <Route path="/terms-of-use" element={<TermsOfUsePage />} />
          <Route path="/payment-terms" element={<PaymentTermsPage />} />
          <Route path="/reservations-bookings" element={<ReservationsBookingsPage />} />
          <Route path="/bus-booking-terms" element={<BusBookingTermsPage />} />
          <Route path="/flight-booking-terms" element={<FlightBookingTermsPage />} />
          <Route path="/hotel-booking-terms" element={<HotelBookingTermsPage />} />
          <Route path="/car-rental-terms" element={<CarRentalTermsPage />} />
          <Route path="/holidays-terms" element={<HolidaysTermsPage />} />
          <Route path="/about-us" element={<AboutUsPage />} />
          <Route path="/why-trust-zoltan-visas" element={<WhyTrustUsPage />} />
          <Route path="/why-trust-us" element={<WhyTrustUsPage />} />
          <Route path="/contact-us" element={<ContactUsPage />} />
          <Route path="/contact" element={<ContactUsPage />} />
          <Route path="/travel-visa-agreement" element={<TravelVisaAgreementPage />} />
        </Routes>
      </div>
      {!isAdminPage && <LiveVisaApprovals />}
      {!isAdminPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AppContent />
    </Router>
  );
}

export default App;
