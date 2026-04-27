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
  sequenciaAtual: number;
  melhorStreak: number;
  totalDiasTreinados: number;
  dataTreino: string; // string ISO
};

type DrawWorkoutParams = {
  nomeTreino: string;
  dataTreino: string;
  duracao: string;
  totalSeries: number;
  volume: string;
  exercicios: { nome: string; info: string; isPR?: boolean }[];
};

// Paleta de cores fixas — identidade visual Treinos
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
  if (!dateStr) return "";
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
  { sequenciaAtual, melhorStreak, totalDiasTreinados, dataTreino }: DrawStreakParams
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
  const semana = Math.floor(sequenciaAtual / 7) + 1;
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
  ctx.fillText(String(sequenciaAtual), PAD, y + 80);
  ctx.letterSpacing = "0px";

  // "DIAS" e "SEGUIDOS NO FOCO" ao lado do número
  const numW = ctx.measureText(String(sequenciaAtual)).width + 10;
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

  const diasNoCiclo = sequenciaAtual % 7 === 0 && sequenciaAtual > 0 ? 7 : sequenciaAtual % 7;
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
    { label: "ATUAL",  value: sequenciaAtual,  destaque: true  },
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

  // ── Rodapé: Treinos + data ──
  ctx.font = "900 italic 10px system-ui";
  ctx.fillStyle = VERDE_LABEL;
  ctx.fillText("Treinos", PAD, y);

  ctx.font = "400 9px system-ui";
  ctx.fillStyle = CINZA_FRACO;
  ctx.textAlign = "right";
  ctx.fillText(formatDate(dataTreino), W - PAD, y);
}

/**
 * drawWorkoutCard
 * Desenha o resumo completo do treino.
 */
export function drawWorkoutCard(
  canvas: HTMLCanvasElement,
  { nomeTreino, dataTreino, duracao, totalSeries, volume, exercicios }: DrawWorkoutParams
) {
  const W = 390;
  const H = 520; // Um pouco mais alto para caber a lista de exercícios
  const SCALE = 2;

  canvas.width = W * SCALE;
  canvas.height = H * SCALE;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  const PAD = 24;

  // Fundo
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fillStyle = BG_CARD;
  ctx.fill();

  // Borda
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.strokeStyle = "rgba(34,197,94,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Linha topo
  const gradTop = ctx.createLinearGradient(0, 0, W, 0);
  gradTop.addColorStop(0, "transparent");
  gradTop.addColorStop(0.5, "rgba(34,197,94,0.5)");
  gradTop.addColorStop(1, "transparent");
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, W, 1);

  let y = PAD;

  // Header
  ctx.fillStyle = VERDE;
  ctx.font = "bold 11px system-ui";
  ctx.fillText("🏆 TREINO FINALIZADO", PAD, y + 12);

  y += 35;

  // Nome do Treino
  ctx.font = "900 32px system-ui";
  ctx.fillStyle = BRANCO;
  ctx.fillText(nomeTreino, PAD, y + 30);

  y += 50;

  // Stats Grid
  const stats = [
    { label: "DURAÇÃO", value: duracao },
    { label: "SÉRIES",   value: String(totalSeries) },
    { label: "VOLUME",   value: volume },
  ];

  const colW = (W - PAD * 2) / 3;
  stats.forEach((stat, i) => {
    const sx = PAD + i * colW;
    ctx.font = "900 18px system-ui";
    ctx.fillStyle = BRANCO;
    ctx.textAlign = "left";
    ctx.fillText(stat.value, sx, y + 20);

    ctx.font = "700 8px system-ui";
    ctx.fillStyle = CINZA_LABEL;
    ctx.fillText(stat.label, sx, y + 34);
  });

  y += 60;

  // Separador
  ctx.fillStyle = SEPARADOR;
  ctx.fillRect(PAD, y, W - PAD * 2, 1);

  y += 25;

  // Exercícios
  ctx.font = "700 9px system-ui";
  ctx.fillStyle = CINZA_LABEL;
  ctx.fillText("RESUMO DA SESSÃO", PAD, y);

  y += 20;

  // Lista os primeiros 6 exercícios
  exercicios.slice(0, 6).forEach((ex, i) => {
    const ey = y + i * 45;
    
    // Fundo do item
    roundRect(ctx, PAD, ey, W - PAD * 2, 38, 12);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();

    // Nome
    ctx.font = "bold 13px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(ex.nome, PAD + 12, ey + 16);

    // PR Badge if exists
    if (ex.isPR) {
      ctx.font = "bold 8px system-ui";
      const prW = ctx.measureText("PR").width + 8;
      const nameW = ctx.measureText(ex.nome).width;
      roundRect(ctx, PAD + 12 + nameW + 8, ey + 6, prW, 12, 4);
      ctx.fillStyle = "rgba(251, 191, 36, 0.15)";
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("PR", PAD + 12 + nameW + 12, ey + 15);
    }

    // Info
    ctx.font = "500 11px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(ex.info, PAD + 12, ey + 30);
  });

  if (exercicios.length > 6) {
    ctx.font = "italic 11px system-ui";
    ctx.fillStyle = CINZA_FRACO;
    ctx.textAlign = "center";
    ctx.fillText(`+ ${exercicios.length - 6} exercícios não listados`, W / 2, y + 6 * 45 + 5);
  }

  // Rodapé
  y = H - PAD;
  ctx.font = "900 italic 10px system-ui";
  ctx.fillStyle = VERDE_LABEL;
  ctx.textAlign = "left";
  ctx.fillText("Treinos", PAD, y);

  ctx.font = "400 9px system-ui";
  ctx.fillStyle = CINZA_FRACO;
  ctx.textAlign = "right";
  ctx.fillText(formatDate(dataTreino), W - PAD, y);
}