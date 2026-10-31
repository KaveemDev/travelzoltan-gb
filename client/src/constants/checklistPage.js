// Default copy for the /checklist page. Admins override any of it per route via form_schema.checklist_page.
// {destination} and {citizenship} are replaced with the route's names.
export const CHECKLIST_SECTIONS = [
  { key: 'purposes', label: 'What are you travelling for?' },
  { key: 'documents', label: 'What you’ll typically need' },
  { key: 'mistakes', label: 'Avoid the common mistakes' }
];

export const DEFAULT_CHECKLIST_PAGE = {
  hero_eyebrow: 'Visa support from {citizenship}',
  hero_title: '{destination} visa,',
  hero_highlight: 'handled with confidence.',
  hero_subtitle: 'Expert help with your {destination} application, from document preparation to appointment support.',
  hero_image: '',
  hero_points: ['Expert guidance', 'Secure document handling', 'Appointment support'],
  purpose_heading: 'What are you travelling to {destination} for?',
  purpose_subtitle: 'Choose your trip purpose to see what it usually involves.',
  documents_heading: 'What you’ll typically need for your application.',
  documents_subtitle: 'Pick what describes you best. Tick items off as you gather them.',
  mistakes_heading: 'Avoid the common mistakes.',
  mistakes_subtitle: 'Most refused applications are avoidable. Here is what we check for you before anything is submitted.',
  mistakes: [
    { title: 'Incomplete documentation', description: 'A single missing document can delay or derail an application.', tip: 'We check every item against the official requirements before you submit.' },
    { title: 'Incorrect travel dates', description: 'Dates that don’t match bookings or leave letters raise questions.', tip: 'We cross-check dates across your form, bookings and letters.' },
    { title: 'Information inconsistencies', description: 'Names, addresses or employment details that differ between documents.', tip: 'We make sure every document tells the same story.' },
    { title: 'Missing supporting evidence', description: 'Not enough proof of funds, ties to home or the purpose of your trip.', tip: 'We tell you exactly which evidence strengthens your case.' },
    { title: 'Poorly prepared application', description: 'Rushed forms and unclear answers lead to avoidable refusals.', tip: 'Your consultant reviews the full application with you first.' }
  ],
  sections: {}
};

const fill = (text, ctx) => typeof text === 'string'
  ? text.replace(/\{destination\}/g, ctx.destination).replace(/\{citizenship\}/g, ctx.citizenship)
  : text;

export const getChecklistContent = (formSchema, ctx) => {
  const custom = formSchema?.checklist_page || {};
  const merged = {};
  Object.keys(DEFAULT_CHECKLIST_PAGE).forEach(k => {
    const value = custom[k];
    const empty = value === undefined || value === '' || (Array.isArray(value) && !value.some(Boolean));
    merged[k] = empty ? DEFAULT_CHECKLIST_PAGE[k] : value;
  });
  return {
    ...merged,
    ...Object.fromEntries(Object.entries(merged).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, fill(v, ctx)])),
    hero_points: merged.hero_points.filter(Boolean).map(p => fill(p, ctx)),
    mistakes: merged.mistakes.filter(m => m?.title).map(m => ({ ...m, description: fill(m.description, ctx), tip: fill(m.tip, ctx) })),
    show: Object.fromEntries(CHECKLIST_SECTIONS.map(s => [s.key, custom.sections?.[s.key] !== false]))
  };
};
