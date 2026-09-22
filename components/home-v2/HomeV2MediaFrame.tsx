import Image from 'next/image';
import StoreMediaImage from '@/components/store/StoreMediaImage';

interface Props {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  className?: string;
  ratioClassName?: string;
}

function isRemote(src: string) {
  return src.startsWith('http://') || src.startsWith('https://');
}

export default function HomeV2MediaFrame({
  src,
  alt,
  priority = false,
  sizes,
  className = '',
  ratioClassName = 'aspect-[4/5]',
}: Props) {
  return (
    <div
      className={`relative overflow-hidden bg-mesa-stone ${ratioClassName} ${className}`}
    >
      {isRemote(src) ? (
        <StoreMediaImage
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="home-v2-media-zoom object-cover transition duration-300 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="home-v2-media-zoom object-cover transition duration-300 ease-out group-hover:scale-[1.04]"
        />
      )}
    </div>
  );
}
