const FlightBookingTermsPage = () => {
  return (
    <div className="min-h-screen py-16 px-6 md:px-12 pt-30">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-on-surface mb-8 font-headline">Flight Booking Terms</h1>
        
        <div className="space-y-8 text-slate-600 dark:text-slate-300 font-['Inter'] leading-relaxed">
          <ul className="list-disc pl-6 space-y-3">
            <li>The total price displayed on the Site includes all applicable government taxes.</li>
            <li>You are required to pay the entire amount prior to the confirmation of your booking.</li>
            <li>There will be no refund for 'no-shows' or any partially unused flights.</li>
            <li>Refund against partially utilized ticket is as per airlines terms and conditions and could take up to 90 days.</li>
            <li>To avail of infant fares, an infant must be under 24 months throughout the entire itinerary you are booking. This includes both onward and return journeys. If the infant is 24 months or above on the return journey, you'll need to make a separate booking using a child fare.</li>
            <li>Infants must be accompanied by an adult at least 18 years of age.</li>
            <li>All Tickets/Bookings issued to the customer shall additionally be governed under the terms and conditions as laid out by the respective Airlines / supplier.</li>
            <li>We recommend user to refer airlines terms and conditions before booking the ticket.</li>
            <li>By accepting our booking terms, user is also agreeing to terms & conditions of the respective airline.</li>
          </ul>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4 font-headline">Check-in</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>As per the airline rules, the standard check-in time begins 2 hours before departure for domestic flights.</li>
              <li>For International flights, the check-in time is 3 hours before departure.</li>
              <li>The passenger needs to check-in at least 2 hrs prior departure for Air India and Air India Express domestic flights else will be considered as a no show.</li>
              <li>Infants must have valid proof-of-age documents showing that the infant is less than two years old.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4 font-headline">Cancellation Policy</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cancellation and/or amendment of airline tickets shall at all times are subject to fees/charges/ levies/ payments as may be levied /payable to the relevant airline/carrier in accordance with such relevant airline/carrier cancellation/refund policy.</li>
              <li>Prior to booking tickets, you must acquaint yourself with the relevant airline/carrier cancellation/refund policy with respect to the ticket to be booked by you.</li>
              <li>Any cancellation/amendment fees/charges/levies/payments levied by/payable to the relevant airline shall be to your account.</li>
              <li>If Air ticket cancelling within 24hrs of starting time cancellation will come under "no show", cancellation charges for no show will be differ based on airlines.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FlightBookingTermsPage;
