const HotelBookingTermsPage = () => {
  return (
    <div className="min-h-screen py-16 px-6 md:px-12 pt-30">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-on-surface mb-8 font-headline">Hotel Booking Terms</h1>
        
        <div className="space-y-6 text-slate-600 font-['Inter'] leading-relaxed">
          <ul className="list-disc pl-6 space-y-3">
            <li>The primary guest must be at least 18 years old to be able to check into the hotel.</li>
            <li>Check-in time is 12 pm and check-out time is 12 pm. Early check-in or late check-out is subject to availability and the hotel might charge you extra for it. Please note that the check-in time is subject to change as per hotel policy.</li>
            <li>Your stay does not include additional personal expenses like telephone charges, meals that aren't part of your meal plan, any hotel services you use (like laundry and room service) or tips. The hotel will charge you directly for these when you're checking out.</li>
            <li>It is mandatory for guests to present valid photo identification at the time of check-in. According to government regulations, a valid Photo ID has to be carried by every person above the age of 18 staying at the hotel. The identification proofs accepted are Drivers License, Voters Card, and Passport. Without valid ID the guest will not be allowed to check in. Note- PAN Cards will not be accepted as a valid ID card.</li>
            <li>The hotel reserves the right of admission. Accommodation can be denied to guests posing as a 'couple' if suitable proof of identification is not presented at check-in. Company will not be responsible for any check-in denied by the hotel due to the aforesaid reason.</li>
            <li>Hotels may charge a mandatory meal surcharge on festive periods e.g. Christmas, New Year's Eve etc. All additional charges (including mandatory meal surcharges) need to be cleared directly at the hotel.</li>
            <li>Government has levied service tax on hotel room charges effective on stays from 1st May 2011. This tax may be required to be settled directly at the hotel.</li>
          </ul>

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4 font-headline">Cancellation Charges</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be 18 to check in to this hotel.</li>
              <li>Your credit card is charged the total cost above at time of purchase. Prices and room availability are not guaranteed until full payment is received.</li>
              <li>Failure to check into the hotel, will attract the full cost of stay at the hotel being charged to your credit card.</li>
              <li>All hotels charge a compulsory Gala Dinner Supplement for the Christmas eve and New Year's eve on the stay during respective periods. Besides, other special supplements may be applicable during festival periods such as Diwali, Dusshera etc.</li>
              <li>The charge for the same as applicable at the hotel would have to be cleared directly at the hotel.</li>
              <li>We shall not be responsible for any such additional charges levied by the hotel other than the room charges.</li>
              <li>First night cost (including taxes & service charge) will be charged if you cancel this booking. You might be charged upto the full cost of stay (including taxes & service charge) if you do not check-in to the hotel.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HotelBookingTermsPage;
