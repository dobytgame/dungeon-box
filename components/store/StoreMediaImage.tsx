import Image from 'next/image';

type CommonProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  draggable?: boolean;
};

type FixedSizeProps = CommonProps & {
  fill?: false;
  width: number;
  height: number;
};

type FillProps = CommonProps & {
  fill: true;
  width?: never;
  height?: never;
};

export type StoreMediaImageProps = FixedSizeProps | FillProps;

function canOptimizeRemoteUrl(src: string): boolean {
  if (src.startsWith('data:') || src.startsWith('blob:')) return false;
  if (!src.startsWith('http://') && !src.startsWith('https://')) return false;

  try {
    const { hostname } = new URL(src);
    return hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

/**
 * Serve imagens da loja via next/image (resize/WebP no edge) quando a URL
 * for do Storage do Supabase — reduz Cached Egress no bucket público.
 */
export default function StoreMediaImage(props: StoreMediaImageProps) {
  const { src, alt, className, sizes, priority, draggable } = props;

  if (!canOptimizeRemoteUrl(src)) {
    if (props.fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={className}
          draggable={draggable}
        />
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={props.width}
        height={props.height}
        className={className}
        draggable={draggable}
      />
    );
  }

  if (props.fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? '100vw'}
        className={className}
        priority={priority}
        draggable={draggable}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      sizes={sizes}
      className={className}
      priority={priority}
      draggable={draggable}
    />
  );
}
