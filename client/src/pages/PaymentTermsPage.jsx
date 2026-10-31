import { Link } from 'react-router-dom';

const PaymentTermsPage = () => {
  return (
    <div className="min-h-screen py-16 px-6 md:px-12 pt-30">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-on-surface mb-8 font-headline">Payment Terms & Conditions</h1>
        
        <div className="space-y-6 text-slate-600 font-['Inter'] leading-relaxed">
          <p>We ensure that every transaction you conduct online is in a safe and secure environment. We do not take or store any credit card details or other card details on our servers. User will be directed to Payment Gateway website to enter his/her card details. This site is Master Secure & VBV compliant.</p>

          <p>We reserve the right to refuse or cancel any order placed for a product that is listed at an incorrect price. This shall be regardless of whether the order has been confirmed and/or payment been levied via credit card. In the event the payment has been processed, the same shall be credited to your account and duly notified to you by email.</p>

          <p>We shall not be liable for any credit card fraud. The liability to use a card fraudulently will be on the user and the onus to 'prove otherwise' shall be exclusively on the user.</p>

          <p>If you have any additional queries or concerns, please contact us on the details provided in <Link to="/contact-us" className="text-primary font-semibold hover:underline">'Contact Us' page</Link> of the website.</p>

          <p>While compiling this information, we have endeavored to ensure that all information is correct. However, no guarantee or representation is made to the accuracy or completeness of the information contained here. This information is subject to changes without notice.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentTermsPage;
