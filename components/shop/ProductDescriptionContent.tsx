interface Props {
  html: string;
  className?: string;
}

export default function ProductDescriptionContent({ html, className }: Props) {
  return (
    <div
      className={['product-description', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
