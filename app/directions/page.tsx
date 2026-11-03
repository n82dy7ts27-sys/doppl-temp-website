import { ArrowUpRight, ArrowLeft } from 'lucide-react';

const options = [
  { id: 'editorial', number: '01', title: 'Editorial Chapters', strap: 'A more compelling read.', description: 'Big statements, shorter reading beats and a clear sense of progression. The layout carries the personality; motion gives it depth.', navigation: 'Numbered chapter links, an active marker and a distinct Contact action.', copy: 'Lead sentences gain scale. Supporting detail gets its own space.', motion: 'Briefly held headings and restrained vertical parallax.', tradeoff: 'The strongest fit for the content and assets we have now.', reference: 'https://21st.dev/@hyperiux/components/sticky-content-wrapper', refName: 'Sticky Content Wrapper' },
  { id: 'cinematic', number: '02', title: 'Cinematic Sequence', strap: 'A more expressive presentation.', description: 'Broad cinematic compositions with a quieter header. A reel aperture opens into the page, followed by layered purple reading panels.', navigation: 'An oversized typographic Index, with Contact always visible.', copy: 'Creative and strategic expertise become separate compositions.', motion: 'An expanding reel frame and sections passing over one another.', tradeoff: 'Most dependent on a strong real reel. The preview keeps its placeholder honest.', reference: 'https://21st.dev/@efferd/components/zoom-parallax', refName: 'Zoom Parallax' },
  { id: 'spatial', number: '03', title: 'Spatial Index', strap: 'A more direct way in.', description: 'An open, asymmetric grid with named navigation beside it. How we work comes forward so visitors can start with their own brief.', navigation: 'A persistent chapter rail and direct links to the two engagement routes.', copy: 'Unboxed reading spreads. Capabilities remain the interactive bento.', motion: 'Offset headings settle into alignment as their chapter arrives.', tradeoff: 'Best for purposeful visitors. More structured, less cinematic.', reference: 'https://21st.dev/@ddoemonn/components/scroll-spy', refName: 'Scroll Spy' },
];

export default function Directions() {
  return <main className="direction-board">
    <header className="board-top"><a href="/" className="board-home"><ArrowLeft size={16}/>Current website</a><span className="mono">Doppl / Design workshop / 07.10.26</span></header>
    <div className="board-intro"><p className="mono">Three directions for review</p><h1>Same DOPPL.<br/>A different rhythm.</h1><p>The workshop brought together design, UX and motion specialists. These studies use your existing wording, palette and original mascot to test three different ways of reading and moving through the site.</p></div>
    <div className="board-options">{options.map(option => <article className="board-option" key={option.id}>
      <a className={`board-preview board-preview--${option.id}`} href={`/directions/${option.id}/`} aria-label={`Explore ${option.title}`}>
        <div className="board-mini-nav" aria-hidden="true"><span/><i/><i/><i/></div>
        <img src="/doppl-wordmark.svg" alt="" width="1778" height="239"/>
        <div className="board-mini-body" aria-hidden="true"><b>We Multiply<br/>Brand Potential</b><div><i/><i/><i/><i/></div></div>
        <span className="board-open">Explore direction<ArrowUpRight size={20}/></span>
      </a>
      <div className="board-option-name"><span className="mono">{option.number}</span><h2>{option.title}</h2></div>
      <p className="board-option-strap">{option.strap}</p><p className="board-description">{option.description}</p>
      <dl><div><dt>Navigation</dt><dd>{option.navigation}</dd></div><div><dt>Reading</dt><dd>{option.copy}</dd></div><div><dt>Scroll</dt><dd>{option.motion}</dd></div></dl>
      <p className="board-tradeoff">{option.tradeoff}</p>
      <a className="board-reference" href={option.reference} target="_blank" rel="noreferrer">21st reference: {option.refName}<ArrowUpRight size={13}/></a>
    </article>)}</div>
    <aside className="board-recommendation"><p className="mono">Workshop recommendation</p><h2>Start with Editorial Chapters.</h2><p>It solves the repetitive layouts and dense reading immediately, while letting the mascot remain the expressive part of the identity. The cinematic reel transition could be added once the reel is ready.</p></aside>
    <footer className="board-bottom"><p>Review studies only. The homepage is unchanged.</p><a href="https://motion.dev/docs/react-scroll-animations" target="_blank" rel="noreferrer">Motion implementation reference ↗</a></footer>
  </main>;
}
