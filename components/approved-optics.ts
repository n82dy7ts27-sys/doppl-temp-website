import art from '@/lib/optical-art.json';

/** Two intricate gratings. Only their alpha product creates the broad forms. */
export const OPTICAL_SOURCE = '/optical/approved-combined.svg';
export const OPTICAL_GROUND = art.ground;
const SOURCE_WIDTH = 1800;
const SOURCE_HEIGHT = 1125;
const SPACING = SOURCE_WIDTH / 260;
const BLEED = 24;

export type OpticalComposition = {
  source: string;
  rotation: number;
  zoom: number;
  phase: number;
  palette: string;
  angle: number;
};

export const chapterCompositions: Record<string, OpticalComposition> = art.compositions;
export const opticalCompositions = {
  folds: art.compositions.belief,
  slices: art.compositions.ways,
  overlap: art.compositions.studio,
} satisfies Record<string, OpticalComposition>;

const sourceImages = new Map<string, Promise<[HTMLImageElement, HTMLImageElement]>>();

async function plateImage(svgText: string, family: 'a' | 'b') {
  const source = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (source.querySelector('parsererror')) throw new Error('Invalid optical source.');
  const root = source.documentElement;
  root.setAttribute('viewBox', `${-BLEED} ${-BLEED} ${SOURCE_WIDTH + BLEED * 2} ${SOURCE_HEIGHT + BLEED * 2}`);
  root.setAttribute('width', String(SOURCE_WIDTH + BLEED * 2));
  root.setAttribute('height', String(SOURCE_HEIGHT + BLEED * 2));
  Array.from(root.children).filter(element => element.localName === 'rect').forEach(element => element.remove());
  const paint = Array.from(root.children).find(element => element.localName === 'g');
  const use = paint?.querySelector('use');
  if (!use) throw new Error('Optical source has no source plate.');
  use.setAttribute('href', `#${family}`);
  use.removeAttribute('mask');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' }));
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Optical source could not load.'));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadPlates(source: string) {
  let images = sourceImages.get(source);
  if (!images) {
    images = fetch(source).then(async response => {
      if (!response.ok) throw new Error('Optical source unavailable.');
      const svg = await response.text();
      return Promise.all([plateImage(svg, 'a'), plateImage(svg, 'b')]);
    }).catch(error => {
      sourceImages.delete(source);
      throw error;
    });
    sourceImages.set(source, images);
  }
  return images;
}

export type OpticalRenderer = {
  resize: (width: number, height: number) => void;
  /** Returns true only while a short chapter dissolve still needs frames. */
  draw: (phase: number, x: number, y: number) => boolean;
  setComposition: (next: OpticalComposition, animate?: boolean) => Promise<boolean>;
  finishTransition: () => void;
  releasePlates: () => void;
  dispose: () => void;
};

export async function createOpticalRenderer(
  canvas: HTMLCanvasElement,
  initialComposition: OpticalComposition = chapterCompositions.origin,
  pixelBudget = 6_000_000,
): Promise<OpticalRenderer> {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable.');
  let composition = initialComposition;
  let images = await loadPlates(composition.source);
  let plates: [HTMLCanvasElement, HTMLCanvasElement] | undefined;
  let previous: HTMLCanvasElement | undefined;
  let transitionStart = 0;
  let revision = 0;
  let disposed = false;
  let scale = 1;
  let padding = 0;

  function rasterize(image: HTMLImageElement, tint: boolean) {
    const layer = document.createElement('canvas');
    layer.width = canvas.width + padding * 2;
    layer.height = canvas.height + padding * 2;
    const paint = layer.getContext('2d');
    if (!paint) throw new Error('Source canvas unavailable.');
    paint.save();
    paint.translate(layer.width / 2, layer.height / 2);
    paint.rotate(composition.rotation);
    paint.drawImage(image,
      -(SOURCE_WIDTH / 2 + BLEED) * scale,
      -(SOURCE_HEIGHT / 2 + BLEED) * scale,
      (SOURCE_WIDTH + BLEED * 2) * scale,
      (SOURCE_HEIGHT + BLEED * 2) * scale);
    paint.restore();
    if (tint) {
      // Colour belongs to the carrier lines. No independent coloured form is added.
      const angle = composition.angle * Math.PI / 180;
      const dx = Math.cos(angle) * layer.width / 2;
      const dy = Math.sin(angle) * layer.height / 2;
      const gradient = paint.createLinearGradient(layer.width / 2 - dx, layer.height / 2 - dy, layer.width / 2 + dx, layer.height / 2 + dy);
      const palette = art.palettes[composition.palette as keyof typeof art.palettes] || art.palettes.spectrum;
      for (const stop of palette) gradient.addColorStop(stop.offset, stop.color);
      paint.globalCompositeOperation = 'source-in';
      paint.fillStyle = gradient;
      paint.fillRect(0, 0, layer.width, layer.height);
    }
    return layer;
  }

  function releasePlates() {
    plates?.forEach(plate => { plate.width = plate.height = 1; });
    plates = undefined;
  }
  function releasePrevious() {
    if (previous) previous.width = previous.height = 1;
    previous = undefined;
  }
  function buildPlates() {
    releasePlates();
    const cos = Math.abs(Math.cos(composition.rotation));
    const sin = Math.abs(Math.sin(composition.rotation));
    scale = Math.max(
      (canvas.width * cos + canvas.height * sin) / SOURCE_WIDTH,
      (canvas.height * cos + canvas.width * sin) / SOURCE_HEIGHT,
    ) * composition.zoom;
    padding = Math.ceil(BLEED * scale + 2);
    plates = [rasterize(images[0], true), rasterize(images[1], false)];
  }

  return {
    resize(width, height) {
      const density = 2;
      const budget = Math.min(1, Math.sqrt(pixelBudget / Math.max(1, width * height * density * density)));
      const nextWidth = Math.max(1, Math.round(width * density * budget));
      const nextHeight = Math.max(1, Math.round(height * density * budget));
      if (plates && canvas.width === nextWidth && canvas.height === nextHeight) return;
      releasePrevious();
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      buildPlates();
    },
    async setComposition(next, animate = true) {
      const currentRevision = ++revision;
      const nextImages = await loadPlates(next.source);
      if (disposed || currentRevision !== revision) return false;
      releasePrevious();
      if (animate && plates) {
        previous = document.createElement('canvas');
        previous.width = canvas.width;
        previous.height = canvas.height;
        previous.getContext('2d')?.drawImage(canvas, 0, 0);
        transitionStart = performance.now();
      }
      composition = next;
      images = nextImages;
      buildPlates();
      return true;
    },
    draw(phase, x, y) {
      if (!plates || disposed) return false;
      const dx = x * SPACING * scale / 2;
      const dy = y * SPACING * scale / 2;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'source-over';
      context.drawImage(plates[0], -padding - dx, -padding - dy);
      context.globalCompositeOperation = 'destination-in';
      context.drawImage(plates[1], -padding + (composition.phase + phase) * SPACING * scale + dx, -padding + dy);
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = OPTICAL_GROUND;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'source-over';
      if (previous) {
        const progress = Math.min(1, (performance.now() - transitionStart) / 320);
        context.globalAlpha = 1 - progress * progress * (3 - 2 * progress);
        context.drawImage(previous, 0, 0);
        context.globalAlpha = 1;
        if (progress >= 1) releasePrevious();
      }
      return !!previous;
    },
    finishTransition: releasePrevious,
    releasePlates,
    dispose() {
      disposed = true;
      revision++;
      releasePlates();
      releasePrevious();
      canvas.width = canvas.height = 1;
    },
  };
}
