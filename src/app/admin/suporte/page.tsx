"use client";

import { HelpCircle,  MessageCircle, Mail, FileQuestion, ExternalLink, MessageSquare } from "lucide-react";

export default function SuportePage() {

  return (
    <div className="w-full px-5 pb-32 pt-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-white">Suporte</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[28px] bg-white/5 p-8 border border-white/10 mb-8">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/20">
            <HelpCircle size={32} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Como podemos ajudar?</h2>
          <p className="text-white/60 text-sm max-w-md">
            Nossa equipe está pronta para tirar suas dúvidas e ajudar você a alcançar seus objetivos.
          </p>
        </div>
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <SupportCard 
          icon={<MessageCircle className="text-emerald-400" size={24} />}
          title="WhatsApp"
          description="Fale conosco agora mesmo pelo WhatsApp para suporte rápido."
          buttonText="Iniciar conversa"
          href="https://wa.me/seunumerodecontato"
        />
        <SupportCard 
          icon={<Mail className="text-blue-400" size={24} />}
          title="E-mail"
          description="Envie um e-mail com sua dúvida ou feedback."
          buttonText="Enviar e-mail"
          href="mailto:suporte@workoutapp.com"
        />
      </div>

      {/* FAQ Preview */}
      <h3 className="text-lg font-bold text-white mb-4 px-1">Perguntas Frequentes</h3>
      <div className="space-y-3">
        <FAQItem 
          question="Como editar meu treino?"
          answer="Você pode editar seus treinos acessando a aba 'Meus Treinos' e selecionando o treino que deseja modificar."
        />
        <FAQItem 
          question="Esqueci minha senha, o que fazer?"
          answer="Na tela de login, clique em 'Esqueci minha senha' para receber as instruções de recuperação por e-mail."
        />
        <FAQItem 
          question="O app funciona offline?"
          answer="Sim! Você pode visualizar seus treinos salvos mesmo sem conexão, mas o sincronismo de novos dados requer internet."
        />
      </div>

      {/* Footer Info */}
      <div className="mt-12 p-6 rounded-2xl bg-blue-400/5 border border-blue-400/10 text-center">
        <div className="flex justify-center gap-2 text-blue-400 mb-2">
          <MessageSquare size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Central de Ajuda</span>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Disponível de Segunda a Sexta, das 08h às 18h. <br />
          Tempo médio de resposta: 2 horas.
        </p>
      </div>
    </div>
  );
}

function SupportCard({ 
  icon, 
  title, 
  description, 
  buttonText, 
  href 
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  buttonText: string,
  href: string 
}) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-start hover:bg-white/[0.07] transition group">
      <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/50 mb-6 leading-relaxed">{description}</p>
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center gap-2 text-sm font-bold text-white hover:text-blue-400 transition"
      >
        {buttonText}
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition">
      <div className="flex items-start gap-3">
        <FileQuestion size={18} className="text-white/30 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-white text-sm mb-1">{question}</h4>
          <p className="text-xs text-white/40 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
}
