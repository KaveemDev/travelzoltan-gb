const PaymentModePage = () => {
  return (
    <div className="min-h-screen py-16 px-6 md:px-12 pt-30">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-on-surface mb-8 font-headline">Payment Mode</h1>
        
        <div className="space-y-6 text-slate-600 font-['Inter'] leading-relaxed">
          <p>We accepts payments through 'wire transfer', and 'credit cards'. Credit card holders can use American Express, MasterCard and Visa credit card to pay the amount. On-line credit card payment system is widely used and is safe. Except our service provider, your credit card details will not be shared with anyone. Once you are through with bookings such as hotel rooms, transportation, etc., all the transaction details will be sent to you. In addition to the amount billed, an extra service tax of 2% will be added to your billed amount.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModePage;
