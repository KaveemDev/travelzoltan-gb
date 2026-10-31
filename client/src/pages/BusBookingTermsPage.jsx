const BusBookingTermsPage = () => {
  return (
    <div className="min-h-screen py-16 px-6 md:px-12 pt-30">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-on-surface mb-8 font-headline">Bus Booking Terms</h1>
        
        <div className="space-y-8 text-slate-600 dark:text-slate-300 font-['Inter'] leading-relaxed">
          <p className="text-lg">Apart from the general terms and conditions the below mentioned are the specific bus booking terms.</p>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4 font-headline">Our responsibilities include:</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Issuing a valid ticket (a ticket that will be accepted by the bus operator) for its' network of bus operators</li>
              <li>Providing refund and support in the event of cancellation</li>
              <li>Providing customer support and information in case of any delays / inconvenience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4 font-headline">Our responsibilities do NOT include:</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The bus operator's bus not departing / reaching on time</li>
              <li>The bus operator's employees being rude</li>
              <li>The bus operator's bus seats etc not being up to the customer's expectation</li>
              <li>The bus operator canceling the trip due to unavoidable reasons</li>
              <li>The baggage of the customer getting lost / stolen / damaged</li>
              <li>The bus operator changing a customer's seat at the last minute to accommodate a lady / child</li>
              <li>The customer waiting at the wrong boarding point (please call the bus operator to find out the exact boarding point if you are not a regular traveler on that particular bus)</li>
              <li>The bus operator changing the boarding point and/or using a pick-up vehicle at the boarding point to take customers to the bus departure point</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4 font-headline">Passengers are required to furnish the following at the time of boarding the bus:</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>A copy of the ticket (A print out of the ticket or the print out of the ticket e-mail)</li>
              <li>Identity proof (Driving license, Student ID card, Company ID card, Passport, PAN card or Voter ID card)</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BusBookingTermsPage;
