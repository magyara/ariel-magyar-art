import { useEffect, useState } from 'react';

/**
 * Measures an image's intrinsic aspect ratio so its frame can hug the artwork
 * exactly — no letterboxing inside the border.
 */
export function useImageRatio(src: string | undefined, fallback = '1 / 1'): string {
  const [ratio, setRatio] = useState(fallback);

  useEffect(() => {
    if (!src) return;
    let live = true;
    const im = new Image();
    im.onload = () => {
      if (live && im.naturalWidth && im.naturalHeight) {
        setRatio(`${im.naturalWidth} / ${im.naturalHeight}`);
      }
    };
    im.src = src;
    return () => {
      live = false;
    };
  }, [src]);

  return ratio;
}
