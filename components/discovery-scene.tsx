import type { ReactNode } from 'react';
import { OpticalField, type OpticalMode } from './optical-field';

/** Permanent brand expressions, separate from the replaceable work collection. */
export function DiscoveryScene({
  mode, treatment = 'wide', labels, caption, detail, overlay,
}: {
  mode: OpticalMode;
  treatment?: 'wide' | 'portrait' | 'frieze';
  labels: [string, string];
  caption?: ReactNode;
  detail?: ReactNode;
  overlay?: ReactNode;
}) {
  return <figure className={`discovery-scene discovery-scene--${treatment}${overlay ? ' discovery-scene--statement' : ''}`}>
    <div className="discovery-scene-track">
      <div className="discovery-scene-stage">
        <OpticalField mode={mode} parallax immersive/>
        {labels.some(Boolean) && <div className="discovery-scene-labels mono">
          {labels.map((label, index) => label && <span key={index}><i/> {label}</span>)}
        </div>}
        {overlay && <div className="discovery-scene-overlay">{overlay}</div>}
      </div>
    </div>
    {(caption || detail) && <figcaption className={`discovery-scene-caption${caption ? '' : ' discovery-scene-caption--detail-only'}`}>
      {caption && <p>{caption}</p>}{detail && <span className="discovery-caption-detail">{detail}</span>}
    </figcaption>}
  </figure>;
}
