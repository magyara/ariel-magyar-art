import { useImageRatio } from '../hooks/useImageRatio';
import { light } from '../theme';

interface Props {
  src: string;
  alt: string;
  /** Aspect ratio used before the real one is measured. */
  fallbackRatio?: string;
  position?: string;
}

/**
 * An artwork in a hairline frame. The frame takes the image's true aspect
 * ratio, so the border hugs the art with no blank space.
 */
export default function FramedImage({ src, alt, fallbackRatio, position = 'center' }: Props) {
  const ratio = useImageRatio(src, fallbackRatio);
  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        width: '100%',
        border: light.border,
        aspectRatio: ratio,
        backgroundColor: light.panel,
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: position,
      }}
    />
  );
}
