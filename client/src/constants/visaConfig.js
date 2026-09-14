// Available document icons with descriptive labels and semantic categories
export const DOCUMENT_ICONS = [
  { value: 'description', label: 'Document / File', category: 'General' },
  { value: 'travel', label: 'Passport / Travel ID', category: 'Identity' },
  { value: 'badge', label: 'National ID / Badge', category: 'Identity' },
  { value: 'photo_camera', label: 'Passport Photo', category: 'Identity' },
  { value: 'flight', label: 'Flight Booking', category: 'Travel' },
  { value: 'hotel', label: 'Hotel Reservation', category: 'Travel' },
  { value: 'home_work', label: 'Proof of Residency', category: 'Travel' },
  { value: 'account_balance', label: 'Bank Statement / Finance', category: 'Financial' },
  { value: 'receipt', label: 'Salary Slip / Tax Return', category: 'Financial' },
  { value: 'credit_card', label: 'Payment / Card Statement', category: 'Financial' },
  { value: 'work', label: 'Employment Letter / Contract', category: 'Work' },
  { value: 'school', label: 'Student / University Letter', category: 'Education' },
  { value: 'health_and_safety', label: 'Travel Insurance', category: 'Medical' },
  { value: 'family_restroom', label: 'Invitation / Family Proof', category: 'Family' },
  { value: 'verified', label: 'Attested / Verified Doc', category: 'Official' }
];

export const DEFAULT_PERSONAL_DETAILS_FIELDS = [
  { id: 'first_name', label: 'First Name', defaultRequired: true, defaultVisible: true, icon: 'badge', desc: 'Given names of applicant' },
  { id: 'last_name', label: 'Last Name', defaultRequired: true, defaultVisible: true, icon: 'badge', desc: 'Family name / surname' },
  { id: 'email', label: 'Email Address', defaultRequired: true, defaultVisible: true, icon: 'mail', desc: 'Primary contact email' },
  { id: 'phone', label: 'Phone Number', defaultRequired: true, defaultVisible: true, icon: 'call', desc: 'Primary phone / mobile' },
  { id: 'residential_address', label: 'Residential Address', defaultRequired: true, defaultVisible: true, icon: 'home', desc: 'Current home residence in origin country' },
  { id: 'applicant_status', label: 'Applicant Status', defaultRequired: true, defaultVisible: true, icon: 'work', desc: 'Employment / student / retired status' },
  { id: 'visa_category', label: 'Visa Category', defaultRequired: true, defaultVisible: true, icon: 'category', desc: 'Tourist, Visiting, or Business intent' },
  { id: 'date_of_birth', label: 'Date of Birth', defaultRequired: false, defaultVisible: false, icon: 'calendar_month', desc: 'Applicant birth date' },
  { id: 'passport_number', label: 'Passport Number', defaultRequired: false, defaultVisible: false, icon: 'travel', desc: 'Valid international passport number' },
  { id: 'nationality', label: 'Nationality', defaultRequired: false, defaultVisible: false, icon: 'flag', desc: 'Country of passport / nationality' },
  { id: 'destination_address', label: 'Destination Address', defaultRequired: false, defaultVisible: false, icon: 'flight_land', desc: 'Intended address in destination territory' },
  { id: 'accommodation_address', label: 'Family/Hotel Address', defaultRequired: false, defaultVisible: false, icon: 'hotel', desc: 'Host or hotel accommodation voucher address' }
];
