import type { CSSProperties } from 'react';

type MascotDiagramLabels = {
  direction: string;
  production: string;
  film: string;
  stills: string;
  worlds: string;
};

type MascotDiagramProps = {
  labels: MascotDiagramLabels;
  description?: string;
  className?: string;
};

/** A static relationship diagram; the hero owns the expressive motion. */
export function MascotDiagram({ labels, description, className = '' }: MascotDiagramProps) {
  const expressions = [
    { kind: 'film', pose: '04', label: labels.film },
    { kind: 'stills', pose: '08', label: labels.stills },
    { kind: 'worlds', pose: '14', label: labels.worlds },
  ];

  return <figure className={`mascot-diagram ${className}`} aria-label={description}>
    <figcaption className="mascot-diagram-direction">{labels.direction}</figcaption>
    <div className="mascot-diagram-production">
      <span className="mascot-diagram-source" aria-hidden="true"/>
      <span>{labels.production}</span>
    </div>
    <div className="mascot-diagram-branches" aria-hidden="true">
      <svg viewBox="0 0 300 24" preserveAspectRatio="none" focusable="false">
        <path d="M150 0V8M50 24V19Q50 8 65 8H235Q250 8 250 19V24M150 8V24"/>
      </svg>
    </div>
    <ul className="mascot-diagram-expressions">
      {expressions.map(({ kind, pose, label }) => <li className={`mascot-diagram-expression mascot-diagram-expression--${kind}`} key={kind}>
        <span className="mascot-diagram-art" aria-hidden="true">
          <span className="mascot-diagram-format" style={{
            '--mascot-diagram-pose': `url('/mascot/echo/pose-${pose}.png')`,
            '--mascot-diagram-outline': `url('/mascot/echo/outline-${pose}.png')`,
          } as CSSProperties}>
            <span className="mascot-diagram-echo mascot-diagram-echo--first"/>
            <span className="mascot-diagram-echo mascot-diagram-echo--second"/>
            <span className="mascot-diagram-pose"/>
          </span>
        </span>
        <span className="mascot-diagram-output-label">{label}</span>
      </li>)}
    </ul>
  </figure>;
}
