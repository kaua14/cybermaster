// Ilustrações originais em SVG: traço de 1px em branco-osso, preenchimentos chapados, sem gradiente.
// No máximo uma por tela.

/** Paisagem da barra lateral (reaproveitada do protótipo v5). */
export function Paisagem() {
  return (
    <svg viewBox="0 0 236 96" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Paisagem desértica com um monólito e uma figura ao longe" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="var(--tinta)" strokeWidth="1" strokeLinecap="round">
        <path d="M0 8H236M0 15H236M0 23H236M0 32H236M0 42H236M0 53H236" opacity=".35" />
        <circle cx="170" cy="40" r="15" fill="var(--ocre)" />
        <path d="M0 66L18 64L26 58L52 58L58 64L92 64L100 68L0 68Z" fill="var(--papel-2)" />
        <path d="M118 68L122 22L131 18L136 68" fill="var(--papel)" />
        <path d="M122 22L125 68M131 18L130 68" opacity=".5" />
        <path d="M0 68H236" strokeWidth="1.5" />
        <path d="M6 96L16 69M22 96L32 69M38 96L48 69M54 96L64 69M70 96L80 69M86 96L96 69M102 96L112 69M150 96L160 69M166 96L176 69M182 96L192 69M198 96L208 69M214 96L224 69" opacity=".35" />
        <circle cx="90" cy="76" r="1.6" fill="var(--tinta)" />
        <path d="M90 78V85M90 80L87.5 84M90 80L92.5 84M90 85L88 90M90 85L92 90" />
        <path d="M30 80c2-3 6-3 8 0z M196 86c2-3 6-3 8 0z" fill="var(--papel)" />
        <path d="M30 24q3-3 6 0q3-3 6 0M60 34q2-2 4 0q2-2 4 0" />
      </g>
    </svg>
  );
}

/** Tela de login: estrada que some no horizonte, cidade ao fundo, figura minúscula. */
export function Estrada() {
  return (
    <svg viewBox="0 0 420 150" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Estrada no deserto rumo a uma cidade distante, com uma figura pequena na beira" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="var(--tinta)" strokeWidth="1" strokeLinecap="round">
        <path d="M0 10H420M0 19H420M0 30H420M0 43H420M0 58H420" opacity=".3" />
        <circle cx="96" cy="66" r="20" fill="var(--ocre)" />
        {/* cidade: blocos chapados na linha do horizonte */}
        <path d="M232 92V74H240V92M244 92V60H254V92M258 92V68H266V92M270 92V50H277V44H280V92M284 92V64H294V92M298 92V72H304V92" fill="var(--papel)" />
        <path d="M278 44V36" />
        <path d="M0 92H420" strokeWidth="1.5" />
        {/* estrada em perspectiva */}
        <path d="M150 150L205 92M300 150L215 92" fill="var(--papel)" />
        <path d="M225 150L212 128M209 121L207 112M205 106L205 100" opacity=".7" />
        {/* chão em hachura diagonal */}
        <path d="M8 150L28 93M30 150L50 93M52 150L72 93M74 150L94 93M96 150L116 93M118 150L138 93M330 150L350 93M352 150L372 93M374 150L394 93M396 150L416 93" opacity=".3" />
        {/* poste e fio */}
        <path d="M330 92V52M324 56H336M336 56Q370 70 420 64" />
        {/* figura */}
        <circle cx="134" cy="112" r="2" fill="var(--tinta)" />
        <path d="M134 115V124M134 117L131 122M134 117L137 121M134 124L132 131M134 124L136.5 131" />
      </g>
    </svg>
  );
}

/** Estado vazio: horizonte, placa fincada no chão, figura sentada. */
export function Vazio() {
  return (
    <svg viewBox="0 0 320 110" role="img" aria-label="Horizonte vazio com uma placa e uma figura sentada" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="var(--tinta)" strokeWidth="1" strokeLinecap="round">
        <path d="M40 18H280M60 28H260M80 40H240" opacity=".3" />
        <circle cx="226" cy="58" r="11" fill="var(--ocre)" />
        <path d="M20 70H300" strokeWidth="1.5" />
        <path d="M60 110L72 72M90 110L102 72M120 110L132 72M190 110L202 72M220 110L232 72M250 110L262 72" opacity=".3" />
        <path d="M150 86V48" />
        <path d="M136 48H170V60H136Z" fill="var(--papel)" />
        <path d="M141 54H164" opacity=".6" />
        <circle cx="166" cy="78" r="1.6" fill="var(--tinta)" />
        <path d="M166 80V85L171 85L172 90M166 82L169 84" />
      </g>
    </svg>
  );
}
