// Decorative, slow-moving site backdrop; all motion is switched off under prefers-reduced-motion (index.css)
const AnimatedBackground = () => (
  <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-gradient-to-b from-primary/[0.04] via-white to-white">
    <div className="apply-blob absolute -top-32 -right-24 w-[38rem] h-[38rem] rounded-full bg-primary/10 blur-3xl" style={{ '--dx': '-60px', '--dy': '40px' }} />
    <div className="apply-blob absolute top-1/3 -left-40 w-[32rem] h-[32rem] rounded-full bg-secondary/10 blur-3xl" style={{ '--dx': '70px', '--dy': '-30px', animationDelay: '-8s' }} />
    <div className="apply-blob absolute -bottom-40 right-1/4 w-[28rem] h-[28rem] rounded-full bg-primary/[0.07] blur-3xl" style={{ '--dx': '40px', '--dy': '-50px', animationDelay: '-14s' }} />
    <div
      className="absolute inset-0 opacity-60"
      style={{
        backgroundImage: 'radial-gradient(rgb(15 23 42 / 0.09) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        maskImage: 'radial-gradient(ellipse at 70% 40%, black 10%, transparent 65%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 70% 40%, black 10%, transparent 65%)'
      }}
    />
    <svg className="absolute top-24 right-0 w-[60rem] max-w-none h-80 text-primary/30" viewBox="0 0 960 320" fill="none">
      <path className="apply-dash" d="M0 300 C 260 260, 420 120, 960 40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round" />
    </svg>
    <span className="apply-float material-symbols-outlined absolute top-28 right-[12%] text-primary/25 text-3xl" style={{ '--r': '35deg' }}>flight</span>
    {[[12, 18], [22, 82], [48, 8], [66, 90], [82, 30], [90, 70]].map(([top, left], i) => (
      <span key={i} className="apply-twinkle absolute w-1.5 h-1.5 rounded-full bg-primary/50" style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${i * 0.8}s` }} />
    ))}
  </div>
);

export default AnimatedBackground;
