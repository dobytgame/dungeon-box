import '@/app/home-v2/home-v2.css';

export default function SiteHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="home-v2 font-body">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-mesa-ember focus:px-4 focus:py-3 focus:font-homeBody focus:text-sm focus:font-semibold focus:text-mesa-ink"
      >
        Pular para o conteúdo
      </a>
      {children}
    </div>
  );
}
