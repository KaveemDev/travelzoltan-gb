// Default content for the /apply wizard. Admins override any of it per route via form_schema.apply_flow.
// `locked` steps can't be switched off: Details creates the application, Pay takes the money.
export const APPLY_STEPS = [
  { key: 'destination', label: 'Destination', heading: 'Where are you going?', subtitle: 'Pick your passport and destination. Everything after this is tailored to the route.' },
  { key: 'status', label: 'Status', heading: 'What do you do?', subtitle: 'Your work or study situation decides which supporting documents you need.' },
  { key: 'purpose', label: 'Purpose', heading: 'What’s the trip for?', subtitle: 'The purpose sets your visa category and the documents that go with it.' },
  { key: 'centre', label: 'Centre', heading: 'Where will you apply?', subtitle: 'Choose the visa centre for your appointment. You can switch later with your consultant.' },
  { key: 'dates', label: 'Dates', heading: 'When are you going, and with how many?', subtitle: 'We plan your timeline backwards from the departure date. An estimate is fine.' },
  { key: 'details', label: 'Details', heading: 'Tell us who’s applying', subtitle: 'Names exactly as they appear in the passport.', locked: true },
  { key: 'documents', label: 'Documents', heading: 'Upload your documents', subtitle: 'Clear photos or PDFs are fine. We check everything before your appointment.' },
  { key: 'support', label: 'Support', heading: 'How much help would you like?', subtitle: 'The same expert team handles every package. You’re choosing how much of the work we take on.' },
  { key: 'pay', label: 'Pay', heading: 'Check your answers, then pay', subtitle: 'Card payments are taken on a secure checkout, then you come straight back here.', locked: true }
];

// `key` is the applicant category used to look up required documents
export const DEFAULT_STATUSES = [
  { key: 'employed', label: 'Employed', description: 'Working for an employer', icon: 'work' },
  { key: 'self_employed', label: 'Self-employed / Director', description: 'Running your own business', icon: 'domain' },
  { key: 'student', label: 'Student', description: 'Enrolled in school or university', icon: 'school' },
  { key: 'unemployed', label: 'Unemployed / Dependent', description: 'Supported by a sponsor or family', icon: 'person' },
  { key: 'retired', label: 'Retired', description: 'Living on a pension or savings', icon: 'elderly' }
];

// `key` is the visa category used to look up required documents
export const DEFAULT_PURPOSES = [
  { key: 'tourist', label: 'Tourist', description: 'Holiday and sightseeing', icon: 'flight_takeoff', points: ['Travel itinerary', 'Proof of accommodation', 'Proof of funds', 'Evidence of ties to home'] },
  { key: 'business', label: 'Business', description: 'Meetings, conferences and trade', icon: 'business_center', points: ['Invitation from the host company', 'Letter from your employer', 'Proof of funds'] },
  { key: 'family', label: 'Family / Friends', description: 'Visiting people you know', icon: 'group', points: ['Invitation from your host', 'Host’s status in the country', 'Proof of relationship'] }
];

export const getApplyFlow = (formSchema, appointmentData) => {
  const flow = formSchema?.apply_flow || {};
  // drop half-filled rows from the admin editor
  const customStatuses = (flow.statuses || []).filter(p => p.key && p.label);
  const customPurposes = (flow.purposes || []).filter(p => p.key && p.label);
  const customCentres = (flow.centres || []).filter(c => c.name);
  const centres = customCentres.length
    ? customCentres
    : (appointmentData?.centers || []).map(c => ({ name: c.city, description: c.center_name || '' })).filter(c => c.name);
  return {
    steps: APPLY_STEPS.map(s => {
      const o = flow.steps?.[s.key] || {};
      return {
        ...s,
        label: o.label || s.label,
        heading: o.heading || s.heading,
        subtitle: o.subtitle || s.subtitle,
        enabled: s.locked || o.enabled !== false
      };
    }),
    statuses: customStatuses.length ? customStatuses : DEFAULT_STATUSES,
    purposes: customPurposes.length ? customPurposes : DEFAULT_PURPOSES,
    centres,
    packages: (flow.packages || []).filter(p => p.key && p.title)
  };
};
