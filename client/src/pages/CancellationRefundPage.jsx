import { Link } from 'react-router-dom';

const CancellationRefundPage = () => {
  return (
    <div className="min-h-screen py-16 px-6 md:px-12 pt-30">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-on-surface mb-8 font-headline">Cancellation & Refund Policy</h1>
        
        <div className="space-y-6 text-slate-600 font-['Inter'] leading-relaxed">
          <p>The tickets booked through our site are cancelable depend on the cancellation policy of the bus operators not through policy of the site owner. Please note that the cancellation fee and cancellation period may differ from one bus operator to another. Please contact any of our executives for complete details or enter your ticket number on the print ticket tab to read the cancellation policy for your ticket.</p>

          <p>We reconcile all booking and cancelled transactions on our system with operators and payment gateways on transaction + 10 days. All online transactions which got failed and whereas we received the payment from the payment gateway, will be automatically refunded by the system once confirmed from the payment gateway and operators (Bus). An email will be sent to your email id registered with us. Please note in refund cases, the concerned bank may take 4-7 days to post a credit to your account.</p>

          <p>In cases, where you are not satisfied with the resolution, you may drop a mail to the mail id in our <Link to="/contact-us" className="text-primary font-semibold hover:underline">contact us page</Link>. These requests will be accepted only after +10 days of the transaction. Thank you for using our services.</p>
        </div>
      </div>
    </div>
  );
};

export default CancellationRefundPage;
