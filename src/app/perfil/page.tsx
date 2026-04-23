"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowBackIosNew,
  Edit,
  Logout,
  Person,
  Settings,
  LockReset,
  NoAccounts,
} from "@mui/icons-material";
import { desativarConta, getPerfil, patchPerfil, redefinirSenhaLogado } from "@/services/api";
import toast from "react-hot-toast";

type Usuario = {
  id: number;
  nome: string;
  email: string;
  idade?: number;
  peso?: number;
  altura?: number;
  fotoPerfil?: string | null;
};

/**
 * Converte um valor vindo da API (peso ou altura) para string usada nos inputs.
 *
 * A API pode retornar números, strings, null ou undefined dependendo do estado do perfil.
 * Esta função normaliza todos esses casos:
 * - Valores inválidos (null, undefined, string vazia, não finito, <= 0) → retorna ""
 * - Valores válidos → retorna a representação em string do número
 * Isso evita exibir "0", "null" ou NaN nos inputs de métricas.
 */
function metricaApiParaInput(v: unknown): string {
  if (v === null || v === undefined || v === "") {
    return "";
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    return "";
  }
  return String(n);
}

async function compressImageToDataUrl(file: File): Promise<string> {
  const imageBitmap = await createImageBitmap(file);
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(imageBitmap.width, imageBitmap.height));
  const targetWidth = Math.max(1, Math.round(imageBitmap.width * scale));
  const targetHeight = Math.max(1, Math.round(imageBitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível processar a imagem.");
  }

  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  imageBitmap.close();

  return canvas.toDataURL("image/jpeg", 0.75);
}

export default function PerfilPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [peso, setPeso] = useState<string>("");
  const [altura, setAltura] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  // Controla a visibilidade do menu dropdown de configurações (redefinir senha, desativar conta)
  const [showSettings, setShowSettings] = useState(false);
  // Controla a visibilidade do modal de redefinição de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  // Armazena a foto de perfil como base64 ou URL; null exibe o ícone padrão
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  // Controla a visibilidade do modal de confirmação de desativação de conta
  const [showDesativarModal, setShowDesativarModal] = useState(false);
  // Impede duplo clique no botão enquanto a requisição de desativação está em andamento
  const [desativando, setDesativando] = useState(false);

  /**
   * Fecha o dropdown de configurações e abre o modal de redefinição de senha.
   *
   * Separado em função própria para garantir que o menu sempre feche
   * antes de o modal aparecer, evitando sobreposição visual.
   */
  const handleRedefinirSenha = () => {
    setShowSettings(false);
    setShowPasswordModal(true);
  };

  /**
   * Fecha o dropdown de configurações e abre o modal de confirmação de desativação.
   *
   * Substituiu o uso de `confirm()` nativo do browser, que bloqueia a thread principal
   * e não pode ser estilizado. O modal mantém o fluxo dentro do app, preservando
   * a experiência visual e permitindo exibir um estado de loading durante a requisição.
   */
  const handleDesativarConta = () => {
    setShowSettings(false);
    setShowDesativarModal(true);
  };

  /**
   * Envia a requisição de desativação de conta para a API após confirmação no modal.
   *
   * Separado de `handleDesativarConta` para isolar a lógica assíncrona da abertura do modal.
   * O estado `desativando` desabilita os botões durante a requisição, evitando chamadas duplicadas.
   * Em caso de sucesso, chama `sair()` para limpar o storage e redirecionar ao login,
   * pois a conta desativada não pode mais ser usada para autenticação.
   * O `finally` garante que o loading e o modal sejam sempre resetados, mesmo em caso de erro.
   */
  const confirmarDesativarConta = async () => {
    setDesativando(true);
    try {
      const res = await desativarConta();
      if (res.ok) {
        toast.success("Conta desativada. Saindo...");
        sair();
      } else {
        toast.error("Erro ao desativar conta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na conexão com o servidor.");
    } finally {
      setDesativando(false);
      setShowDesativarModal(false);
    }
  };

  /**
   * Valida e envia a nova senha do usuário para a API.
   *
   * Realiza duas validações antes de chamar a API:
   * 1. Comprimento mínimo de 8 caracteres.
   * 2. Confirmação idêntica à nova senha.
   * Em caso de sucesso, fecha o modal e limpa os campos para não vazar a senha no estado.
   * Em caso de falha, exibe a mensagem de erro retornada pela API ou um erro genérico.
   */
  const confirmarRedefinirSenha = async () => {
    if (!novaSenha || novaSenha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    try {
      await redefinirSenhaLogado(novaSenha);
      toast.success("Senha redefinida com sucesso!");
      setShowPasswordModal(false);
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Erro na conexão com o servidor.";
      toast.error(message);
    }
  };

  /**
   * Busca os dados do perfil do usuário autenticado ao montar o componente.
   *
   * Após receber os dados da API, popula os estados com os valores normalizados
   * via `metricaApiParaInput` para garantir compatibilidade com os inputs controlados.
   * Se a resposta não contiver `nome` (perfil inválido ou não autenticado),
   * redireciona para a raiz. O mesmo ocorre em caso de erro de rede.
   */
  useEffect(() => {
    const buscarUsuario = async () => {
      try {
        const data = await getPerfil();
        if (data.nome) {
          setUsuario(data);
          setPeso(metricaApiParaInput(data.peso));
          setAltura(metricaApiParaInput(data.altura));
          setFotoPerfil(data.fotoPerfil ?? null);
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar perfil");
        router.push("/");
      }
    };

    buscarUsuario();
  }, [router]);

  /**
   * Calcula o IMC (Índice de Massa Corporal) de forma reativa com `useMemo`.
   *
   * Recalcula automaticamente sempre que peso ou altura mudam.
   * Retorna null para qualquer combinação inválida (valores não finitos, zero ou negativos),
   * evitando exibir resultados sem sentido enquanto o usuário digita.
   * O resultado é arredondado para uma casa decimal (ex: 24.9).
   * Fórmula: IMC = peso / (altura²)
   */
  const bmi = useMemo(() => {
    const p = Number(peso);
    const a = Number(altura);
    if (!Number.isFinite(p) || !Number.isFinite(a) || p <= 0 || a <= 0) return null;
    const value = p / (a * a);
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 10) / 10;
  }, [peso, altura]);

  /**
   * Encerra a sessão do usuário removendo os dados do localStorage e redirecionando ao login.
   *
   * Remove tanto o token de autenticação quanto o objeto do usuário para garantir
   * que nenhuma informação sensível fique armazenada após o logout.
   */
  const sair = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    router.push("/");
  };

  /**
   * Valida e envia as alterações de peso, altura e foto de perfil para a API.
   *
   * Campos em branco são enviados como `undefined` (sem alteração no backend).
   * Realiza validação client-side dos valores numéricos antes de chamar a API,
   * evitando requisições desnecessárias com dados inválidos.
   * Em caso de sucesso, atualiza o estado local com os dados retornados pela API,
   * garantindo que os inputs reflitam os valores efetivamente salvos.
   * O `finally` garante que o estado de loading seja sempre desativado.
   */
  const salvarAlteracoes = async () => {
    const p = peso.trim() === "" ? undefined : Number(peso);
    const a = altura.trim() === "" ? undefined : Number(altura);

    if (p !== undefined && (!Number.isFinite(p) || p <= 0)) {
      toast.error("Peso inválido.");
      return;
    }
    if (a !== undefined && (!Number.isFinite(a) || a <= 0)) {
      toast.error("Altura inválida.");
      return;
    }

    setSalvando(true);
    try {
      const data = await patchPerfil({ peso: p, altura: a, fotoPerfil });

      if (data.id) {
        setUsuario(data);
        setPeso(metricaApiParaInput(data.peso));
        setAltura(metricaApiParaInput(data.altura));
        setFotoPerfil(data.fotoPerfil ?? null);
        const userStr = localStorage.getItem("usuario");
        if (userStr) {
          try {
            const storedUser = JSON.parse(userStr);
            localStorage.setItem(
              "usuario",
              JSON.stringify({
                ...storedUser,
                fotoPerfil: data.fotoPerfil ?? null,
                sexo: data.sexo ?? storedUser.sexo,
              }),
            );
          } catch { }
        }
        toast.success("Alterações salvas!");
      } else {
        throw new Error(data.message || "Erro ao salvar alterações");
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Erro ao salvar alterações.";
      toast.error(message);
    } finally {
      setSalvando(false);
    }
  };

  /**
   * Processa o arquivo de imagem selecionado pelo usuário e converte para base64.
   *
   * Realiza duas validações antes de processar:
   * 1. Tipo MIME deve ser de imagem (evita uploads de PDFs, vídeos etc.).
   * 2. Tamanho máximo de 8MB para não sobrecarregar a API com payloads grandes.
   *
   * Usa `compressImageToDataUrl` para redimensionar e converter a imagem em base64,
   * que é salva no estado e enviada junto com as demais alterações do perfil.
   * O campo de input é resetado após a leitura para permitir selecionar o mesmo arquivo novamente.
   */
  const handleFotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 8MB.");
      event.target.value = "";
      return;
    }

    try {
      const result = await compressImageToDataUrl(file);
      if (result.length > 900_000) {
        toast.error("A imagem ainda está grande. Use uma foto menor.");
        event.target.value = "";
        return;
      }
      setFotoPerfil(result);
      toast.success("Foto carregada. Clique em salvar alterações.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível processar a imagem.");
    }

    // Reseta o valor do input para permitir selecionar o mesmo arquivo novamente se necessário
    event.target.value = "";
  };

  // Exibe tela de carregamento enquanto os dados do perfil ainda não chegaram da API
  if (!usuario) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-center text-white/80">Carregando...</p>
      </main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
      {/* Header: botão voltar à esquerda, título centralizado e menu de configurações à direita */}
      <div className="mb-8 flex items-center justify-between">
        <div className="h-10 w-10" />

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 text-white/80 hover:text-white hover:bg-white/5 transition"
          aria-label="Voltar"
        >
          <ArrowBackIosNew fontSize="small" />
        </button>

        <div className="text-sm font-semibold tracking-wide text-green-400 sm:text-base">
          Perfil
        </div>

        {/* Botão de configurações com dropdown de ações sensíveis (senha e desativação de conta) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`rounded-full p-2 transition ${showSettings ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            aria-label="Configurações"
          >
            <Settings fontSize="small" />
          </button>

          {showSettings && (
            <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1830] shadow-2xl">
              <button
                onClick={handleRedefinirSenha}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition"
              >
                <LockReset fontSize="small" />
                Redefinir Senha
              </button>
              {/* Ação destrutiva: cor vermelha para destacar o risco da ação */}
              <button
                onClick={handleDesativarConta}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-400/5 transition"
              >
                <NoAccounts fontSize="small" />
                Desativar Conta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Avatar: exibe foto personalizada (base64 ou URL) ou ícone padrão quando não há foto */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          {/* "relative" necessário para o fill do Image do Next.js funcionar corretamente */}
          <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#0d162c] ring-[3px] ring-green-400/90 shadow-[0_0_0_6px_rgba(34,197,94,0.18)]">
            {fotoPerfil ? (
              <Image
                src={fotoPerfil}
                alt="Foto de perfil"
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              <Person className="text-white/70" sx={{ fontSize: 72 }} />
            )}
          </div>
          {/* Label funciona como botão de upload: aciona o input file oculto ao clicar */}
          <label
            htmlFor="fotoPerfilInput"
            className="absolute bottom-1 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:brightness-110"
            aria-label="Editar foto"
            title="Editar foto"
          >
            <Edit fontSize="small" />
          </label>
          {/* Input file oculto: aceita apenas imagens e delega o processamento a handleFotoChange */}
          <input
            id="fotoPerfilInput"
            type="file"
            accept="image/*"
            onChange={handleFotoChange}
            className="hidden"
          />
        </div>

        {/* Exibe apenas o nome completo; truncate evita quebra de layout com nomes longos */}
        <div className="mt-2 max-w-full truncate text-3xl font-extrabold tracking-tight sm:text-4xl">
          {usuario.nome}
        </div>
      </div>

      {/* Cards de estatísticas: idade fixa (vinda da API) e IMC calculado em tempo real */}
      <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/5 bg-[#111b34] p-5 shadow-sm">
          <div className="text-center text-[10px] tracking-[0.25em] text-white/35">Idade</div>
          <div className="mt-2 text-center text-4xl font-extrabold text-green-400 sm:text-5xl">
            {/* Exibe "-" quando a idade não foi cadastrada no perfil */}
            {usuario.idade ?? "-"}
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#111b34] p-5 shadow-sm">
          <div className="text-center text-[10px] tracking-[0.25em] text-white/35">IMC</div>
          <div className="mt-2 text-center text-4xl font-extrabold text-cyan-300 sm:text-5xl">
            {/* Exibe "-" quando peso ou altura são inválidos (bmi retorna null via useMemo) */}
            {bmi ?? "-"}
          </div>
        </div>
      </div>

      {/* Seção de métricas físicas: inputs controlados para peso e altura */}
      <section className="mt-10 space-y-4">
        <div className="flex items-center justify-between gap-3 text-white/85">
          <span className="text-2xl font-semibold tracking-tight sm:text-4xl">Métricas Físicas</span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-green-400/20 bg-green-400/15 text-green-300">
            <Settings fontSize="small" />
          </span>
        </div>

        <div className="space-y-4">
          {/* Input de peso: inputMode="decimal" abre teclado numérico com vírgula em mobile */}
          <div className="rounded-3xl border border-white/10 bg-[#1a2339] px-5 py-4">
            <div className="text-[11px] tracking-[0.25em] text-white/40">PESO (KG)</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                inputMode="decimal"
                className="w-full bg-transparent text-3xl font-semibold leading-none text-white/90 outline-none sm:text-[38px]"
                placeholder="—"
              />
              <div className="text-xl text-white/30">↔</div>
            </div>
          </div>

          {/* Input de altura: mesmo padrão do peso, em metros (ex: 1.75) */}
          <div className="rounded-3xl border border-white/10 bg-[#1a2339] px-5 py-4">
            <div className="text-[11px] tracking-[0.25em] text-white/40">ALTURA (M)</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                inputMode="decimal"
                className="w-full bg-transparent text-3xl font-semibold leading-none text-white/90 outline-none sm:text-[38px]"
                placeholder="—"
              />
              <div className="text-xl text-white/30">↕</div>
            </div>
          </div>
        </div>
      </section>

      {/* Área de ações: salvar alterações e logout */}
      <div className="mt-10 space-y-4">
        {/* Botão desabilitado durante o salvamento para evitar requisições duplicadas */}
        <button
          type="button"
          onClick={salvarAlteracoes}
          disabled={salvando}
          className="w-full rounded-[32px] bg-blue-600 py-5 text-lg font-extrabold tracking-wide shadow-[0_18px_40px_rgba(37,99,235,0.45)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? "SAVING..." : "SALVAR ALTERAÇÕES"}
        </button>

        <button
          type="button"
          onClick={sair}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/5 bg-[#101a30] py-4 font-semibold text-white/85 transition hover:bg-white/5"
        >
          <Logout fontSize="small" className="text-orange-400" />
          LOGOUT
        </button>
      </div>

      {/* Modal de redefinição de senha: sobrepõe toda a tela com backdrop blur */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-slate-950 p-8 border border-white/10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                <LockReset sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-xl font-bold">Redefinir Senha</h3>
              <p className="text-sm text-white/50">Crie uma nova senha de acesso.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-white/40 uppercase ml-1">Nova Senha</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 p-4 text-white ring-1 ring-white/10 focus:ring-blue-500 outline-none transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-white/40 uppercase ml-1">Confirmar Senha</label>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 p-4 text-white ring-1 ring-white/10 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Botões do modal: cancelar limpa os campos sem salvar; confirmar aciona a API */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNovaSenha("");
                  setConfirmarSenha("");
                }}
                className="flex-1 rounded-2xl bg-white/5 py-4 text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRedefinirSenha}
                className="flex-1 rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white hover:bg-blue-500 transition shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de desativação: segue o mesmo padrão visual do modal de senha,
          com cores vermelhas para reforçar o caráter destrutivo e irreversível da ação */}
      {showDesativarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-slate-950 p-8 border border-white/10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <NoAccounts sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-xl font-bold">Desativar Conta</h3>
              <p className="text-sm text-white/50">
                Tem certeza? Você{" "}
                <span className="text-red-400 font-medium">não poderá mais fazer login</span>{" "}
                após desativar sua conta.
              </p>
            </div>

            {/* Botões do modal: cancelar fecha sem agir; confirmar aciona a API com loading */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDesativarModal(false)}
                disabled={desativando}
                className="flex-1 rounded-2xl bg-white/5 py-4 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              {/* Botão desabilitado durante a requisição para evitar chamadas duplicadas */}
              <button
                onClick={confirmarDesativarConta}
                disabled={desativando}
                className="flex-1 rounded-2xl bg-red-600 py-4 text-sm font-bold text-white hover:bg-red-500 transition shadow-[0_10px_20px_rgba(220,38,38,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {/* Spinner inline substitui o texto durante o loading, sem deslocar o layout */}
                {desativando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Desativando...
                  </>
                ) : "Sim, desativar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}