interface Props {
  message?: string;
}

/** Nota discreta — visível apenas em desenvolvimento. */
export default function DevBanner({ message }: Props) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <p className="mb-6 text-xs leading-relaxed text-stone-600">
      {message ?? 'Área em evolução — checkout e pagamentos chegam em breve.'}
    </p>
  );
}
