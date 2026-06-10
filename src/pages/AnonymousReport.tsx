import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ShieldAlert, Send, ArrowLeft, CheckCircle2, Heart, Info, User, Phone, MapPin, Inbox } from "lucide-react";

export default function AnonymousReport() {
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get("schoolId");
  const [message, setMessage] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentContact, setStudentContact] = useState("");
  const [isDenuncia, setIsDenuncia] = useState(false);
  const [occurrenceLocation, setOccurrenceLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [school, setSchool] = useState<any>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadSchool = async () => {
      if (schoolId) {
        try {
          const found = await api.schools.get(schoolId);
          setSchool(found);
        } catch (err) {
          console.error("Error loading school for report:", err);
          // Fallback
          api.schools.list({ public: true }).then(schools => {
            const found = (schools || []).find((s: any) => s.id === schoolId);
            setSchool(found);
          });
        }
      }
    };
    loadSchool();
  }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    let aiData = { level: 'PENDENTE', isEmergency: false, category: 'outro' };

    try {
      // AI Analysis via Backend
      const response = await fetch('/api/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (response.ok) {
        aiData = await response.json();
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
      // Fallback already set to PENDENTE
    }

    try {
      await api.anonymousReports.create({
        schoolId,
        schoolUnit: school?.unit || school?.name || "",
        unit: school?.unit || school?.name || "",
        ownerId: school?.ownerId || "",
        message,
        studentName: studentName.trim() || "Anônimo",
        studentContact: studentContact.trim() || "",
        isDenuncia,
        occurrenceLocation: isDenuncia ? occurrenceLocation.trim() : "",
        aiAnalysis: aiData,
        status: 'new',
        timestamp: new Date().toISOString()
      });

      setIsSuccess(true);
    } catch (err) {
      console.error("Firestore creation failed:", err);
      alert("Desculpe, houve um erro ao registrar sua mensagem. Tente novamente em instantes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-pedagogic-blue/5 via-[#f8fafc] to-pedagogic-teal/5 flex items-center justify-center p-6">
      {isSuccess ? (
        <div key="success-card" className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full border border-slate-100 animate-in zoom-in duration-300 text-center">
          <div className="w-24 h-24 bg-pedagogic-teal/10 text-pedagogic-teal rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">Envio Concluído!</h2>
          <p className="text-slate-500 mb-10 leading-relaxed font-semibold text-sm">
            Nossa Caixinha do Acolhimento guardou seu relato! A psicóloga e a equipe do AEE vão analisar sua mensagem com todo o carinho e absoluto sigilo. Obrigado por expressar sua voz!
          </p>
          <button 
            type="button"
            onClick={() => navigate(`/student-portal?schoolId=${schoolId}`)}
            className="w-full bg-pedagogic-blue text-white py-5 rounded-[1.5rem] font-extrabold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 text-xs uppercase tracking-widest"
          >
            Voltar ao Início
          </button>
        </div>
      ) : (
        <div key="form-card" className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10 relative overflow-hidden border border-white/50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-pedagogic-teal/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
          
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="relative z-10 flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-8 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-extrabold uppercase tracking-widest">Voltar</span>
          </button>

          <div className="relative z-10 flex items-center gap-5 mb-10">
            <div className="bg-pedagogic-teal text-white p-4 rounded-[1.5rem] shadow-xl shadow-teal-100">
              <Inbox size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Caixinha do Acolhimento</h1>
              <p className="text-xs text-slate-400 font-extrabold uppercase tracking-[0.2em] mt-1">Sua voz importa • Espaço de Escuta Ativa</p>
            </div>
          </div>

          {/* Informational Text clarifying purpose, anonymity, and implications of identification */}
          <div className="bg-gradient-to-br from-[#f8fafc] to-blue-50/50 border border-slate-100 p-8 rounded-[2rem] mb-10 space-y-4 shadow-sm">
            <div className="flex gap-3 items-start">
              <div className="text-pedagogic-blue shrink-0 mt-0.5">
                <Heart size={20} className="fill-pedagogic-blue/10" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                Este é o seu canal de diálogo seguro. Sinta-se à vontade para compartilhar um desabafo ou relatar denúncias de situações que estejam te incomodando ou oferecendo risco na escola (como bullying, assédio, violência ou desatendimento).
              </p>
            </div>

            <div className="flex gap-3 items-start border-t border-slate-100 pt-4">
              <div className="text-pedagogic-amber shrink-0 mt-0.5">
                <Info size={20} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                <strong className="text-slate-700 font-bold">Importante:</strong> Você pode enviar seu relato de forma <strong className="text-slate-700 font-bold">totalmente anônima</strong> se quiser. No entanto, em certos casos de denúncia complexa ou de sofrimento intenso, sem a sua identificação, o psicólogo e a equipe do AEE podem ter dificuldades para agir diretamente ou oferecer a proteção específica que você ou a situação requerem. Se sentir segurança, informe seus dados no formulário abaixo!
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
            
            {/* Main textarea */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pedagogic-teal"></span>
                O que você gostaria de relatar ou desabafar? *
              </label>
              <textarea 
                className="w-full h-48 px-6 py-5 bg-slate-50/50 border border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-pedagogic-teal/10 focus:bg-white transition-all text-slate-700 resize-none font-semibold text-base leading-relaxed shadow-inner"
                placeholder="Escreva com toda tranquilidade. Detalhe como se sente, o que está acontecendo e como podemos acolher você..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {/* Classification toggle if it is a report/denuncia */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={isDenuncia}
                  onChange={(e) => setIsDenuncia(e.target.checked)}
                  className="w-5 h-5 rounded text-pedagogic-teal border-slate-200 focus:ring-pedagogic-teal/20 focus:ring-offset-0"
                />
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-widest block">Isso é uma Denúncia?</span>
                  <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Selecione se for reclamação de bullying, agressão ou irregularidade.</span>
                </div>
              </label>

              {isDenuncia && (
                <div key="location-input" className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1.5 pl-1">
                    <MapPin size={12} className="text-pedagogic-rose" /> Onde está acontecendo ou aconteceu o fato? *
                  </label>
                  <input 
                    type="text"
                    required={isDenuncia}
                    placeholder="Ex: Sala de aula da série X, pátio durante o intervalo, corredor..."
                    className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-pedagogic-teal/5 font-semibold text-slate-700"
                    value={occurrenceLocation}
                    onChange={(e) => setOccurrenceLocation(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Optional identification details */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Quer se identificar? (Totalmente Opcional)</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Se preferir manter o anonimato completo, pode deixar os campos abaixo totalmente em branco.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1.5 pl-1">
                    <User size={12} className="text-slate-400" /> Seu Nome completo ou apelido
                  </label>
                  <input 
                    type="text"
                    placeholder="Nome (Ex: João silva)"
                    className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-pedagogic-teal/5 font-semibold text-slate-700 placeholder:text-slate-300"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1.5 pl-1">
                    <Phone size={12} className="text-slate-400" /> Contato ou Ano / Série / Turma
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: 9º Ano A / WhatsApp ou E-mail"
                    className="w-full px-5 py-3.5 bg-white border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-pedagogic-teal/5 font-semibold text-slate-700 placeholder:text-slate-300"
                    value={studentContact}
                    onChange={(e) => setStudentContact(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full bg-pedagogic-teal hover:bg-teal-600 text-white py-6 rounded-[1.75rem] font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl shadow-teal-100 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95 group"
            >
              {isSubmitting ? (
                <span key="submitting-span" className="flex items-center gap-2">
                  <span className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
                  <span>Enviando com carinho...</span>
                </span>
              ) : (
                <span key="submit-span" className="flex items-center gap-2">
                  <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  <span>Colocar na Caixinha do Acolhimento</span>
                </span>
              )}
            </button>
          </form>

          <div className="mt-12 flex flex-col items-center gap-2 relative z-10">
             <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">Ambiente Acolhedor • SGE Psicologia</p>
             <div className="w-16 h-1 bg-slate-100 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}
