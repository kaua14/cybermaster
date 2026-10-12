export function Painel({ legenda, children, className }: { legenda?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ? `card ${className}` : "card"}>
      {legenda && <div className="legenda">{legenda}</div>}
      {children}
    </div>
  );
}

export function Titulo({ numero, children, desc }: { numero: string; children: React.ReactNode; desc?: string }) {
  return (
    <>
      <h1 className="secao-titulo">
        <small>{numero}</small>
        {children}
      </h1>
      {desc && <p className="secao-desc">{desc}</p>}
    </>
  );
}
