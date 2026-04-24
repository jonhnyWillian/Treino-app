/**
 * drawStreakCard
 *
 * Desenha o card de streak diretamente no Canvas 2D API.
 * Isso garante que a imagem gerada seja idêntica em qualquer ambiente,
 * sem depender de captura de DOM (html2canvas / dom-to-image),
 * que falha com CSS moderno (oklab/lab) do Tailwind v4.
 *
 * @param canvas - HTMLCanvasElement onde o card será desenhado
 * @param params - dados do streak e configurações visuais
 */

type DrawStreakParams = {
  streakAtual: number;
  melhorStreak: number;
  totalDiasTreinados: number;
  dataTreino: string; // string ISO
};

// Paleta de cores fixas — identidade visual Kinetic
const VERDE = "#22c55e";
const VERDE_DIM = "rgba(34,197,94,0.15)";
const VERDE_BORDER = "rgba(34,197,94,0.35)";
const VERDE_LABEL = "rgba(34,197,94,0.7)";
const BG_CARD = "#0f1f0f";
const BG_DIA = "rgba(255,255,255,0.04)";
const BG_DIA_BORDER = "rgba(255,255,255,0.08)";
const BRANCO = "#ffffff";
const CINZA_FORTE = "rgba(255,255,255,0.4)";
const CINZA_MEDIO = "rgba(255,255,255,0.25)";
const CINZA_FRACO = "rgba(255,255,255,0.15)";
const CINZA_LABEL = "rgba(255,255,255,0.3)";
const SEPARADOR = "rgba(255,255,255,0.06)";

const DIAS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];

/**
 * Formata data ISO para DD/MM/AAAA
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Desenha um retângulo com bordas arredondadas.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function drawStreakCard(
  canvas: HTMLCanvasElement,
  { streakAtual, melhorStreak, totalDiasTreinados, dataTreino }: DrawStreakParams
) {
  const W = 390;  // largura base (equivale a um mobile 390px)
  const H = 420;  // altura do card
  const SCALE = 2; // resolução 2× para Retina / Instagram

  canvas.width = W * SCALE;
  canvas.height = H * SCALE;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  const PAD = 24; // padding interno

  // ── Fundo do card ──
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fillStyle = BG_CARD;
  ctx.fill();

  // Borda verde sutil
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.strokeStyle = "rgba(34,197,94,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Linha brilhante no topo
  const gradTop = ctx.createLinearGradient(0, 0, W, 0);
  gradTop.addColorStop(0, "transparent");
  gradTop.addColorStop(0.5, "rgba(34,197,94,0.5)");
  gradTop.addColorStop(1, "transparent");
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, W, 1);

  let y = PAD;

  // ── Header: ícone + "ACTIVE STREAK" + badge "SEMANA X" ──
  ctx.fillStyle = VERDE;
  ctx.font = "bold 11px system-ui";
  ctx.fillText("🔥 ACTIVE STREAK", PAD, y + 12);

  // Badge semana
  const semana = Math.floor(streakAtual / 7) + 1;
  const badgeText = `SEMANA ${semana}`;
  ctx.font = "bold 9px system-ui";
  const badgeW = ctx.measureText(badgeText).width + 20;
  const badgeX = W - PAD - badgeW;
  roundRect(ctx, badgeX, y, badgeW, 20, 10);
  ctx.fillStyle = "rgba(34,197,94,0.12)";
  ctx.fill();
  roundRect(ctx, badgeX, y, badgeW, 20, 10);
  ctx.strokeStyle = "rgba(34,197,94,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = VERDE;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + badgeW / 2, y + 13);
  ctx.textAlign = "left";

  y += 40;

  // ── Número grande de dias ──
  ctx.font = `900 88px system-ui`;
  ctx.fillStyle = BRANCO;
  ctx.letterSpacing = "-4px";
  ctx.fillText(String(streakAtual), PAD, y + 80);
  ctx.letterSpacing = "0px";

  // "DIAS" e "SEGUIDOS NO FOCO" ao lado do número
  const numW = ctx.measureText(String(streakAtual)).width + 10;
  ctx.font = "700 22px system-ui";
  ctx.fillStyle = CINZA_FORTE;
  ctx.fillText("DIAS", PAD + numW + 8, y + 58);

  ctx.font = "700 9px system-ui";
  ctx.fillStyle = CINZA_MEDIO;
  ctx.fillText("SEGUIDOS NO FOCO", PAD + numW + 8, y + 76);

  y += 100;

  // ── Label progresso + contador ──
  ctx.font = "700 9px system-ui";
  ctx.fillStyle = CINZA_LABEL;
  ctx.fillText("PRÓXIMA CONQUISTA", PAD, y);

  const diasNoCiclo = streakAtual % 7 === 0 && streakAtual > 0 ? 7 : streakAtual % 7;
  ctx.fillStyle = VERDE;
  ctx.textAlign = "right";
  ctx.fillText(`${diasNoCiclo} / 7 dias`, W - PAD, y);
  ctx.textAlign = "left";

  y += 10;

  // ── Barra de progresso ──
  const barW = W - PAD * 2;
  const barH = 4;
  roundRect(ctx, PAD, y, barW, barH, 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();

  const progW = barW * Math.min(diasNoCiclo / 7, 1);
  if (progW > 0) {
    roundRect(ctx, PAD, y, progW, barH, 2);
    ctx.fillStyle = VERDE;
    ctx.fill();
  }

  y += 14;

  // ── Mini calendário semanal ──
  const diaW = Math.floor((barW - 6 * 4) / 7); // largura de cada célula
  const diaH = 28;
  DIAS_SEMANA.forEach((dia, i) => {
    const dx = PAD + i * (diaW + 4);
    const concluido = i < diasNoCiclo;

    roundRect(ctx, dx, y, diaW, diaH, 8);
    ctx.fillStyle = concluido ? VERDE_DIM : BG_DIA;
    ctx.fill();
    roundRect(ctx, dx, y, diaW, diaH, 8);
    ctx.strokeStyle = concluido ? VERDE_BORDER : BG_DIA_BORDER;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "700 9px system-ui";
    ctx.fillStyle = concluido ? "rgba(34,197,94,0.85)" : "rgba(255,255,255,0.2)";
    ctx.textAlign = "center";
    ctx.fillText(dia, dx + diaW / 2, y + 18);
    ctx.textAlign = "left";
  });

  y += diaH + 20;

  // ── Separador ──
  ctx.fillStyle = SEPARADOR;
  ctx.fillRect(PAD, y, barW, 1);

  y += 16;

  // ── Stats: Melhor / Atual / Total ──
  const statW = barW / 3;
  const stats = [
    { label: "MELHOR", value: melhorStreak, destaque: false },
    { label: "ATUAL",  value: streakAtual,  destaque: true  },
    { label: "TOTAL",  value: totalDiasTreinados, destaque: false },
  ];

  stats.forEach(({ label, value, destaque }, i) => {
    const sx = PAD + i * statW;

    // Separadores laterais na coluna central
    if (i === 1) {
      ctx.fillStyle = SEPARADOR;
      ctx.fillRect(sx, y - 4, 1, 44);
      ctx.fillRect(sx + statW, y - 4, 1, 44);
    }

    ctx.font = "900 18px system-ui";
    ctx.fillStyle = destaque ? VERDE : BRANCO;
    ctx.textAlign = "center";
    ctx.fillText(String(value), sx + statW / 2, y + 20);

    ctx.font = "700 8px system-ui";
    ctx.fillStyle = CINZA_LABEL;
    ctx.fillText(label, sx + statW / 2, y + 36);
    ctx.textAlign = "left";
  });

  y += 52;

  // ── Rodapé: KINETIC + data ──
  ctx.font = "900 italic 10px system-ui";
  ctx.fillStyle = VERDE_LABEL;
  ctx.fillText("KINETIC", PAD, y);

  ctx.font = "400 9px system-ui";
  ctx.fillStyle = CINZA_FRACO;
  ctx.textAlign = "right";
  ctx.fillText(formatDate(dataTreino), W - PAD, y);
  ctx.textAlign = "left";

  // Linha verde na base
  const gradBot = ctx.createLinearGradient(0, 0, W, 0);
  gradBot.addColorStop(0, "transparent");
  gradBot.addColorStop(0.5, "rgba(34,197,94,0.4)");
  gradBot.addColorStop(1, "transparent");
  ctx.fillStyle = gradBot;
  ctx.fillRect(0, H - 1, W, 1);
}