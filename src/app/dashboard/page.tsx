"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Dumbbell, Flame, LayoutDashboard, Plus, Timer, Trophy, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardResumo, getPerfil, type DashboardResumoResponse } from "@/services/api";
import { useNav } from "@/components/navWrapper";

export default function DashboardPage() {
  const { openSidebar } = useNav();
  const [userGender, setUserGender] = useState<string | null>(null);
  const [userName, setUserName] = useState("Atleta");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResumoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Bom dia");

  /**
   * Retorna uma saudação com base na hora atual do dia.
   * Divide o dia em três períodos: manhã (até 12h), tarde (até 18h) e noite (a partir de 18h).
   * Usado para personalizar a mensagem de boas-vindas exibida no topo do dashboard.
   */
  const getGreetingByHour = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Bom dia";
    }
    else if (hour < 18) {
      return "Boa tarde";
    } else {
      return "Boa noite";
    }
  };

  /**
   * Effect responsável por carregar os dados iniciais da página ao montar o componente.
   *
   * Usa setTimeout com delay 0 para diferir a execução para após a hidratação do React,
   * evitando erros de acesso ao localStorage durante SSR (Next.js roda no servidor também).
   *
   * Tarefas realizadas:
   * 1. Lê os dados do usuário (gênero, nome, foto de perfil) do localStorage.
   * 2. Chama a API para buscar o resumo do dashboard (treinos, volume, recordes etc.).
   * 3. Atualiza o estado com os dados recebidos e desativa o indicador de carregamento.
   */
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const userStr = localStorage.getItem("usuario");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.sexo) setUserGender(user.sexo);
          if (user.nome) setUserName(user.nome);
          if (user.fotoPerfil) setProfilePhoto(user.fotoPerfil);
        }
        catch { }
      }

      try {
        const perfil = await getPerfil();
        if (perfil?.nome) setUserName(perfil.nome);
        if (perfil?.sexo) setUserGender(perfil.sexo);
        if ("fotoPerfil" in (perfil ?? {})) setProfilePhoto(perfil.fotoPerfil ?? null);
      } catch { }

      const resumo = await getDashboardResumo();
      setDashboardData(resumo);
      setLoading(false);
    }, 0);

    // Limpa o timeout caso o componente seja desmontado antes da execução,
    // evitando atualizações de estado em componentes já removidos da árvore.
    return () => clearTimeout(timeout);
  }, []);

  /**
   * Effect responsável por atualizar a saudação automaticamente a cada minuto.
   *
   * Isso garante que, se o usuário deixar a tela aberta e o período do dia mudar
   * (ex: passou das 12h), a saudação é atualizada sem precisar recarregar a página.
   * O intervalo é limpo ao desmontar o componente para evitar memory leaks.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreetingByHour());
    }, 60_000);

    // Cancela o intervalo quando o componente for desmontado.
    return () => clearInterval(interval);
  }, []);

  /**
   * Retorna o caminho da imagem de perfil padrão com base no gênero do usuário.
   *
   * Se o usuário não tiver enviado uma foto personalizada, exibe um avatar genérico
   * feminino ou masculino, dependendo do dado salvo no perfil.
   * Isso melhora a experiência visual sem exigir foto obrigatória no cadastro.
   */
  const getProfileImage = () => {
    if (profilePhoto) return profilePhoto;
    if (userGender === "Feminino") {
      return "/imagens/perfil/feminino.png";
    } else {
      return "/imagens/perfil/masculino.png";
    }
  };

  /**
   * Formata uma duração em segundos para uma string legível em horas e minutos.
   *
   * Retorna "--" para valores inválidos ou zerados, evitando exibir "0 min" nos cards
   * quando o usuário ainda não tem treinos registrados.
   * Exemplo: 3720 → "1h 2m" | 900 → "15 min"
   */
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) {
      return "--";
    }
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    } else {
      return `${mins} min`;
    }
  };

  /**
   * Formata uma string de data ISO para um formato de exibição localizado em pt-BR.
   *
   * Exibe dia, mês abreviado, hora e minuto — um formato compacto e informativo
   * para mostrar quando o último treino foi realizado no card de resumo.
   * Exemplo: "2024-06-15T14:30:00Z" → "15 de jun. 14:30"
   */
  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Extrai os dados da semana da API; usa array vazio como fallback
  // para evitar erros de renderização enquanto os dados ainda estão carregando.
  const weekData = dashboardData?.semana ?? [];

  // Calcula o maior valor de treinos da semana para normalizar a altura das barras do gráfico.
  // O mínimo é 1 para evitar divisão por zero quando não há treinos registrados.
  const maxWeek = Math.max(...weekData.map((d) => d.treinos), 1);

  return (
    <div className="w-full px-4 pb-32 pt-4 sm:px-5 sm:pt-5">
      <div className="flex items-center justify-between">
        <button
          onClick={openSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div className="text-right">
          <div className="text-blue-400 text-lg font-semibold uppercase tracking-wider">RESUMOS DOS TREINOS</div>
        </div>
      </div>

      <div className="mt-5">
        {/* Exibe apenas o primeiro nome do usuário para uma saudação mais pessoal e compacta */}
        <h1 className="text-3xl font-bold leading-tight text-white sm:text-[34px] sm:leading-none">
          {greeting}, <span className="text-blue-400">{userName.split(" ")[0]}</span>
        </h1>
        <p className="mt-1 text-sm text-white/50">Seu corpo e o reflexo da sua disciplina.</p>
      </div>

      {/* Card de consistência: mostra o total de treinos (dias seguidos) da semana */}
      <div className="mt-5 rounded-3xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Consistência</div>
            <div className="mt-1 text-3xl font-bold text-white sm:text-4xl">
              {dashboardData?.resumo.totalTreinos ?? 0}
              <span className="ml-1 text-sm font-medium text-white/60">dias seguidos</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
            <Flame size={24} />
          </div>
        </div>
      </div>

      {/* Card de próximo treino: link direto para a página de treino com informações do dia */}
      <Link href="/treino" className="mt-5 block overflow-hidden rounded-3xl ring-1 ring-white/10">
        <div className="relative h-48">
          <Image src="/imagens/perfil/cardTreino.png" alt="Treino" fill sizes="(max-width: 640px) 100vw, 48rem" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/75" />
          <div className="absolute inset-0 p-4">
            <div className="inline-flex rounded-full bg-blue-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em]">
              Hoje - Próximo treino
            </div>
            <div className="mt-4 text-3xl font-extrabold italic text-white/90 sm:text-4xl">TREINO B</div>
            <div className="text-lg text-blue-300">Costas e Bíceps</div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold uppercase tracking-wider">
              Iniciar treino <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </Link>

      {/* Card do último treino: exibe os 3 primeiros exercícios com volume em kg por série */}
      <div className="mt-5 rounded-3xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold uppercase text-white/80">Último treino</div>
          <div className="text-xs text-white/40">
            {/* Exibe a data do último treino formatada, ou "--" se ainda não houver registros */}
            {dashboardData?.ultimoTreino?.dataTreino
              ? formatDateTime(dashboardData.ultimoTreino.dataTreino)
              : "--"}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {/* Limita a 3 exercícios para manter o card compacto no dashboard */}
          {(dashboardData?.ultimoTreino?.exercicios ?? []).slice(0, 3).map((ex) => (
            <div key={ex.nome} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{ex.nome}</div>
                <div className="text-xs text-white/45">{ex.series} séries</div>
              </div>
              <div className="text-sm font-semibold text-emerald-300">{ex.volumeKg.toFixed(0)} kg</div>
            </div>
          ))}
          {/* Mensagem de fallback exibida quando o usuário ainda não concluiu nenhum treino */}
          {(dashboardData?.ultimoTreino?.exercicios ?? []).length === 0 && (
            <div className="rounded-xl bg-white/5 p-3 text-sm text-white/55">
              Nenhum treino concluído ainda.
            </div>
          )}
        </div>
      </div>

      {/* Card semanal: volume total em kg, duração total e gráfico de barras por dia da semana */}
      <div className="mt-5 rounded-3xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-white/45">Esta semana</div>
            <div className="mt-1 text-3xl font-bold text-white">
              {(dashboardData?.resumo.totalVolumeKg ?? 0).toFixed(1)}
              <span className="ml-1 text-base text-white/60">kg</span>
            </div>
          </div>
          <div className="text-white/40">
            <Timer size={16} className="inline" />{" "}
            {formatDuration(dashboardData?.resumo.totalDuracaoSegundos ?? 0)}
          </div>
        </div>

        {/* Gráfico de barras: altura proporcional ao número de treinos do dia em relação ao maior da semana */}
        <div className="mt-4 grid h-40 grid-cols-7 items-end gap-2">
          {weekData.map((day) => (
            <div key={day.date} className="flex h-full flex-col items-center justify-end gap-2">
              {/* Barra azul se houver treino no dia; cinza se não houver. Altura mínima de 12% para visibilidade */}
              <div
                className={`w-full rounded-md ${day.treinos > 0 ? "bg-blue-500" : "bg-white/10"}`}
                style={{ height: `${Math.max((day.treinos / maxWeek) * 100, 12)}%` }}
              />
              <div className="text-[10px] text-white/40">{day.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards de destaque: recorde pessoal de carga e média de duração por sessão */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/recordes" className="block rounded-2xl bg-[#0f1a31] p-4 ring-1 ring-white/10 active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">Recorde pessoal</div>
            <ChevronRight size={14} className="text-white/20" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {dashboardData?.destaques.recordeCargaKg ?? 0}
            <span className="ml-1 text-sm text-white/55">kg</span>
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-blue-300">
            {dashboardData?.destaques.recordeExercicio ?? "--"}
          </div>
        </Link>
        <div className="rounded-2xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
          <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">Média treino</div>
          <div className="mt-2 text-2xl font-bold text-white">
            {/* Calcula a média dividindo a duração total pelo número de treinos;
                retorna "--" via formatDuration se totalTreinos for 0 para evitar divisão por zero */}
            {formatDuration(
              dashboardData?.resumo.totalTreinos ? Math.floor(
                (dashboardData.resumo.totalDuracaoSegundos || 0) / dashboardData.resumo.totalTreinos) : 0
            )}
          </div>
          <div className="mt-1 text-xs text-white/45">por sessão</div>
        </div>
      </div>

      {/* Barra de ações rápidas: navegar para treino, ver insights ou adicionar nova ação */}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/treino" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold">
          <Dumbbell size={16} /> Treinar
        </Link>
        <Link href="/historico" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-semibold">
          <Trophy size={16} /> Treinos
        </Link>
        <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500" aria-label="Nova ação">
          <Plus size={18} />
        </button>
      </div>

      {/* Indicador de carregamento exibido enquanto os dados da API ainda estão sendo buscados */}
      {loading ? <div className="mt-4 text-center text-xs text-white/40">Carregando dados...</div> : null}
    </div>
  );
}