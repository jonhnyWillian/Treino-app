"use client";

import { ShieldCheck,  Lock, Eye, FileText, Bell } from "lucide-react";

// Página de política de privacidade — rota protegida.
// Exige autenticação e exibe a sidebar via useNav (padrão das telas internas).
export default function PrivacidadePage() { 
  return (
    <div className="w-full px-4 pb-32 pt-4 sm:px-5 sm:pt-6 max-w-4xl mx-auto">

      {/* Header: botão menu à esquerda, título centralizado, botão voltar à direita */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-white">Privacidade</h1>        
      </div>

      {/* Hero Section — destaque visual com ícone e descrição */}
      <div className="relative overflow-hidden rounded-[28px] bg-white/5 p-8 border border-white/10 mb-8">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-400/20 flex items-center justify-center mb-4 border border-emerald-400/20">
            <ShieldCheck size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sua privacidade é nossa prioridade</h2>
          <p className="text-white/60 text-sm max-w-md">
            Entenda como protegemos seus dados e quais informações coletamos para melhorar sua experiência de treino.
          </p>
        </div>
      </div>

      {/* Cards de seções de privacidade */}
      <div className="space-y-4">
        <PrivacyCard
          icon={<Lock className="text-blue-400" size={24} />}
          title="Segurança de Dados"
          description="Utilizamos criptografia de ponta a ponta para garantir que seus treinos e dados pessoais estejam sempre protegidos."
        />
        <PrivacyCard
          icon={<Eye className="text-purple-400" size={24} />}
          title="Transparência"
          description="Você tem total controle sobre seus dados. Pode solicitar a exclusão ou exportação das suas informações a qualquer momento."
        />
        <PrivacyCard
          icon={<FileText className="text-emerald-400" size={24} />}
          title="Termos de Uso"
          description="Ao utilizar nosso aplicativo, você concorda com nossas políticas de processamento de dados focadas em saúde e bem-estar."
        />
        <PrivacyCard
          icon={<Bell className="text-orange-400" size={24} />}
          title="Notificações"
          description="Gerencie como e quando deseja ser notificado. Suas preferências de comunicação são respeitadas."
        />
      </div>

      {/* Rodapé informativo com data da última atualização */}
      <div className="mt-12 p-6 rounded-2xl bg-emerald-400/5 border border-emerald-400/10 text-center">
        <p className="text-xs text-white/40 leading-relaxed">
          Última atualização: 13 de Abril de 2026. <br />
          Para dúvidas específicas, entre em contato com nosso suporte.
        </p>
      </div>
    </div>
  );
}

// Componente reutilizável para cada seção da política de privacidade.
// Recebe ícone, título e descrição como props para facilitar a manutenção.
function PrivacyCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex gap-4 items-start hover:bg-white/[0.07] transition group">
      {/* Ícone com efeito de escala no hover para feedback visual */}
      <div className="shrink-0 p-3 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-white/50 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}