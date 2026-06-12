import React, { useState, useEffect } from "react";
import { Plus, Search, FileText, Download, Trash2, Eye, Edit2, ChevronDown, ChevronUp, PlusCircle, X, Check, School, User, Calendar as CalendarIcon, ClipboardCheck, Briefcase, FileCheck, FileSignature, HelpCircle, Users, GraduationCap, UserPlus } from "lucide-react";
import { api } from "../lib/api";
import { generateDocumentPDF } from "../lib/documentGenerator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUnit } from "../contexts/UnitContext";

export default function AtendimentoAee({ user }: { user: any }) {
  const { activeUnit } = useUnit();
  const [documents, setDocuments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schoolsList, setSchoolsList] = useState<any[]>([]);
  const [letterheads, setLetterheads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [docBeingEdited, setDocBeingEdited] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState<any>({
    tipoAtendimento: [],
    origemDemanda: [],
    origemDemandaOutros: "",
    tipoDemanda: [],
    tipoDemandaOutros: "",
    descricaoAtendimento: "",
    observacoesTecnicas: "",
    intervencoesRealizadas: [],
    intervencoesRealizadasOutros: "",
    descricaoComplementar: "",
    encaminhamentos: [],
    encaminhamentosOutros: "",
    descricaoEncaminhamento: "",
    anexos: [],
    anexosOutros: "",
    observacoesAnexos: "",
    responsavel: user?.name || user?.email || ""
  });
  const [selectedStudentForDoc, setSelectedStudentForDoc] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeUnit]);

  const loadData = async () => {
    try {
      setLoading(true);
      const email = user?.email?.toLowerCase() || '';
      const isSuperAdmin = user?.role === 'super-admin' || user?.role === 'admin' || user?.id === 'super_admin' || email === 'maykon.euro@gmail.com' || email.includes('administrador');
      const isCentral = activeUnit === 'Administração Central' || activeUnit === 'Sede';
      
      const filters: any = { 
        unit: isCentral ? undefined : activeUnit, 
        isAdmin: isSuperAdmin,
        type: 'aee_register'
      };
      
      if (!isSuperAdmin) {
        filters.professionalId = user?.id || user?.uid;
        filters.allowedUnits = user?.units || [];
      }

      const [docs, studs, lheads, schools] = await Promise.all([
        api.documents.list(filters),
        api.students.list({ 
          unit: isCentral ? undefined : activeUnit, 
          isAdmin: isSuperAdmin, 
          allowedUnits: user?.units || [] 
        }),
        api.letterheads.listAvailable(user?.id || user?.uid, activeUnit),
        api.schools.list({ 
          isAdmin: isSuperAdmin, 
          allowedUnits: user?.units || [] 
        })
      ]);

      // Filter docs locally just to be extremely secure to only show aee_register tipo
      const aeeDocs = (docs || []).filter((d: any) => d.type === 'aee_register');

      setDocuments(aeeDocs);
      setStudents(studs || []);
      setLetterheads(lheads || []);
      setSchoolsList(schools || []);
    } catch (err) {
      console.error("Erro ao carregar dados do AEE:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setDocBeingEdited(null);
    setSelectedStudentForDoc(null);
    setFormData({
      studentId: "",
      tipoAtendimento: [],
      origemDemanda: [],
      origemDemandaOutros: "",
      tipoDemanda: [],
      tipoDemandaOutros: "",
      descricaoAtendimento: "",
      observacoesTecnicas: "",
      intervencoesRealizadas: [],
      intervencoesRealizadasOutros: "",
      descricaoComplementar: "",
      encaminhamentos: [],
      encaminhamentosOutros: "",
      descricaoEncaminhamento: "",
      anexos: [],
      anexosOutros: "",
      observacoesAnexos: "",
      responsavel: user?.name || user?.email || "",
      letterheadId: ""
    });
    setShowModal(true);
  };

  const handleEdit = (doc: any) => {
    setDocBeingEdited(doc);
    setFormData({
      ...(doc.data || {}),
      studentId: doc.studentId,
      letterheadId: doc.letterheadId || ""
    });
    const student = students.find(s => s.id === doc.studentId);
    setSelectedStudentForDoc(student || null);
    setShowModal(true);
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm("Deseja realmente excluir este registro de Atendimento AEE?")) return;
    try {
      await api.documents.delete(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      alert("Registro excluído com sucesso!");
    } catch (err: any) {
      alert("Erro ao excluir registro: " + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!formData.studentId) {
      alert("Por favor, selecione um aluno antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      const isEditing = !!docBeingEdited;
      const student = students.find(s => s.id === formData.studentId);
      const letterheadIdToSave = formData.letterheadId || "";

      const payload = {
        type: 'aee_register',
        typeName: 'Registro AEE',
        studentId: formData.studentId,
        studentName: student?.name || docBeingEdited?.studentName || 'N/A',
        studentRa: student?.ra || docBeingEdited?.studentRa || '',
        studentClass: student?.class || docBeingEdited?.studentClass || '',
        studentSchool: schoolsList.find(sc => sc.id === student?.schoolId)?.name || docBeingEdited?.studentSchool || '',
        professionalId: user?.id || user?.uid || 'unknown',
        professionalName: user?.name || 'N/A',
        professionalCouncil: user?.professionalCouncil || 'AEE',
        unit: activeUnit,
        letterheadId: letterheadIdToSave,
        data: formData,
        date: isEditing ? docBeingEdited.date : new Date().toISOString()
      };

      if (isEditing) {
        await api.documents.update(docBeingEdited.id, payload);
      } else {
        await api.documents.create(payload);
      }

      setShowModal(false);
      setDocBeingEdited(null);
      setFormData({});
      setSelectedStudentForDoc(null);
      await loadData();
      alert(isEditing ? "Registro AEE atualizado com sucesso!" : "Registro AEE cadastrado com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar Atendimento AEE: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async (doc: any) => {
    try {
      const selectedLh = letterheads.find(l => l.id === doc.letterheadId);
      await generateDocumentPDF(doc, null, selectedLh, 'download');
    } catch (err: any) {
      alert("Erro ao gerar PDF: " + err.message);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const docDate = new Date(doc.date);
    const matchesSearch = String(doc.studentName || "").toLowerCase().includes(search.toLowerCase()) ||
                        String(doc.studentRa || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesMonth = !filterMonth || (docDate.getMonth() + 1) === parseInt(filterMonth);
    const matchesYear = !filterYear || docDate.getFullYear() === parseInt(filterYear);

    return matchesSearch && matchesMonth && matchesYear;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-pedagogic-blue to-blue-700 rounded-[2rem] p-8 text-white overflow-hidden shadow-xl shadow-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black tracking-widest uppercase text-blue-200">
            <ClipboardCheck size={14} /> Atendimento Educacional Especializado
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Atendimento AEE</h1>
          <p className="text-white/80 max-w-2xl text-sm font-medium">
            Emissão, gerenciamento e controle de registros pedagógicos de Atendimento Educacional Especializado (AEE) da unidade escolar.
          </p>
        </div>
        
        <button 
          onClick={handleOpenAdd}
          className="relative z-10 shrink-0 bg-white text-pedagogic-blue font-black uppercase text-xs tracking-widest px-6 py-4 rounded-xl flex items-center gap-2 shadow-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={16} /> Emitir Atendimento AEE
        </button>

        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-white/5 rounded-full blur-2xl" />
      </div>

      {/* Statistics and Filter Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Real-time stats */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Emitidos nesta escola</p>
          <div className="my-2">
            <span className="text-4xl font-black text-gray-800">{documents.length}</span>
            <span className="text-xs text-gray-400 block mt-1">Registros de AEE Ativos</span>
          </div>
        </div>

        {/* Filters */}
        <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm transition-all"
              placeholder="Buscar aluno ou RA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select 
            className="w-full px-4 py-2.5 bg-gray-50/50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm appearance-none cursor-pointer text-gray-600"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="">Filtro por Mês</option>
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1}>
                {format(new Date(2026, i, 1), 'MMMM', { locale: ptBR })}
              </option>
            ))}
          </select>

          <select 
            className="w-full px-4 py-2.5 bg-gray-50/50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm appearance-none cursor-pointer text-gray-600"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="">Filtro por Ano</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {/* Records table list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <div className="w-10 h-10 border-4 border-pedagogic-blue border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold uppercase tracking-widest">Carregando registros...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-16 text-center text-gray-400 space-y-4">
            <ClipboardCheck size={48} className="mx-auto text-gray-300 stroke-[1.5]" />
            <div>
              <p className="font-extrabold text-gray-600">Nenhum atendimento AEE cadastrado</p>
              <p className="text-xs mt-1">Utilize o botão acima para preencher uma ficha de atendimento do AEE.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Estudante</th>
                  <th className="px-6 py-4">Unidade / Escola</th>
                  <th className="px-6 py-4">Responsável AEE</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(doc.date), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{doc.studentName}</p>
                        <p className="text-xs text-gray-400">RA: {doc.studentRa || 'Sem RA'} | Turma: {doc.studentClass || 'Sem Turma'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {doc.studentSchool || doc.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {doc.professionalName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button 
                        onClick={() => handleDownloadPDF(doc)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                      {(isSuperUser(user) || doc.professionalId === user?.id || doc.professionalId === user?.uid) && (
                        <>
                          <button 
                            onClick={() => handleEdit(doc)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation / Edition Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-pedagogic-blue to-blue-700 text-white p-6 shrink-0 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Atendimento Especializado</p>
                <h3 className="text-xl font-bold">{docBeingEdited ? "Editar Ficha de Atendimento AEE" : "Nova Emissão de Ficha AEE"}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              {/* Common Header / Student Selection Card */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase text-sesi-blue tracking-widest">Identificação do Estudante</label>
                <StudentSelector 
                  students={students}
                  schools={schoolsList}
                  selectedStudent={selectedStudentForDoc}
                  onRefresh={loadData}
                  onSelect={(s: any) => {
                    setSelectedStudentForDoc(s);
                    setFormData({...formData, studentId: s.id});
                  }}
                />
              </div>

              {/* Letterhead selection standard layout */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-sesi-blue mb-1">
                  <Briefcase size={16} />
                  <span className="text-xs font-black uppercase tracking-wider">Modelo de Timbrado do Documento</span>
                </div>
                <select 
                  className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-sesi-blue text-xs font-medium text-gray-700"
                  value={formData.letterheadId || ""}
                  onChange={(e) => setFormData({...formData, letterheadId: e.target.value})}
                >
                  <option value="">Usar timbrado padrão do sistema</option>
                  {letterheads.map(lh => (
                    <option key={lh.id} value={lh.id}>
                      {lh.name} {lh.isDefault ? '(Padrão)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Questionnaire Sections */}
              <div className="space-y-6">
                
                {/* 1. CARACTERIZAÇÃO DO ATENDIMENTO */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">01</span>
                    Caracterização do Atendimento
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { id: 'Atendimento individual', label: 'Atendimento individual' },
                      { id: 'Atendimento coletivo', label: 'Atendimento coletivo' },
                      { id: 'Atendimento com família', label: 'Atendimento com família' },
                      { id: 'Atendimento de suporte com equipe escolar', label: 'Atendimento de suporte com equipe escolar' },
                      { id: 'Atendimento a equipe externa', label: 'Atendimento a equipe externa' },
                    ].map(opt => (
                      <label key={opt.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="mt-1 w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.tipoAtendimento?.includes(opt.id) || false}
                          onChange={() => {
                            const list = formData.tipoAtendimento || [];
                            setFormData({
                              ...formData,
                              tipoAtendimento: list.includes(opt.id) ? list.filter((x: string) => x !== opt.id) : [...list, opt.id]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 2. ORIGEM DA DEMANDA */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">02</span>
                    Origem da Demanda
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'Demanda espontânea do estudante',
                      'Família/Responsáveis',
                      'Professores',
                      'Coordenação pedagógica',
                      'Equipe escolar',
                      'Serviço externo'
                    ].map(opt => (
                      <label key={opt} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="mt-1 w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.origemDemanda?.includes(opt) || false}
                          onChange={() => {
                            const list = formData.origemDemanda || [];
                            setFormData({
                              ...formData,
                              origemDemanda: list.includes(opt) ? list.filter((x: string) => x !== opt) : [...list, opt]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}
                    
                    <div className="md:col-span-2 pt-2 border-t border-gray-100">
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all mb-2">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.origemDemanda?.includes("Outros") || false}
                          onChange={() => {
                            const list = formData.origemDemanda || [];
                            setFormData({
                              ...formData,
                              origemDemanda: list.includes("Outros") ? list.filter((x: string) => x !== "Outros") : [...list, "Outros"]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">Outros</span>
                      </label>
                      <input 
                        type="text" 
                        disabled={!formData.origemDemanda?.includes("Outros")}
                        className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm disabled:opacity-50"
                        placeholder="Por favor, especifique o remetente..."
                        value={formData.origemDemandaOutros || ""}
                        onChange={(e) => setFormData({...formData, origemDemandaOutros: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. TIPO DE DEMANDA APRESENTADA */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">03</span>
                    Tipo de Demanda Apresentada
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'Questões emocionais',
                      'Demandas socioemocionais',
                      'Ansiedade',
                      'Conflitos interpessoais',
                      'Bullying',
                      'Rotina/adaptação escolar',
                      'Dificuldades de aprendizagem',
                      'Questões familiares',
                      'Comportamento/agitação',
                      'Baixa autoestima',
                      'Autolesão',
                      'Crise emocional',
                      'Inclusão escolar',
                      'Suspeita de transtorno do neurodesenvolvimento'
                    ].map(opt => (
                      <label key={opt} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="mt-1 w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.tipoDemanda?.includes(opt) || false}
                          onChange={() => {
                            const list = formData.tipoDemanda || [];
                            setFormData({
                              ...formData,
                              tipoDemanda: list.includes(opt) ? list.filter((x: string) => x !== opt) : [...list, opt]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}

                    <div className="md:col-span-2 pt-2 border-t border-gray-100">
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all mb-2">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.tipoDemanda?.includes("Outos") || false}
                          onChange={() => {
                            const list = formData.tipoDemanda || [];
                            setFormData({
                              ...formData,
                              tipoDemanda: list.includes("Outos") ? list.filter((x: string) => x !== "Outos") : [...list, "Outos"]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">Outros</span>
                      </label>
                      <input 
                        type="text" 
                        disabled={!formData.tipoDemanda?.includes("Outos")}
                        className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm disabled:opacity-50"
                        placeholder="Especifique outros transtornos/demandas..."
                        value={formData.tipoDemandaOutros || ""}
                        onChange={(e) => setFormData({...formData, tipoDemandaOutros: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. DESCRIÇÃO DO ATENDIMENTO */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">04</span>
                    Descrição do Atendimento
                  </h4>
                  <textarea 
                    rows={4}
                    className="w-full p-4 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm font-medium text-gray-700"
                    placeholder="Relate detalhadamente os acontecimentos e procedimentos realizados no atendimento..."
                    value={formData.descricaoAtendimento || ""}
                    onChange={(e) => setFormData({...formData, descricaoAtendimento: e.target.value})}
                  />
                </div>

                {/* 5. OBSERVAÇÕES TÉCNICAS */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">05</span>
                    Observações Técnicas de Acompanhamento
                  </h4>
                  <textarea 
                    rows={4}
                    className="w-full p-4 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm font-medium text-gray-700"
                    placeholder="Registre pareceres diagnósticos, evolução pedagógica ou observações psicopedagógicas..."
                    value={formData.observacoesTecnicas || ""}
                    onChange={(e) => setFormData({...formData, observacoesTecnicas: e.target.value})}
                  />
                </div>

                {/* 6. INTERVENÇÕES REALIZADAS */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">06</span>
                    Intervenções Realizadas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'Escuta qualificada',
                      'Acolhimento emocional',
                      'Mediação de conflito',
                      'Orientação ao estudante',
                      'Orientação familiar',
                      'Articulação com equipe pedagógica',
                      'Estratégias de regulação emocional',
                      'Monitoramento escolar'
                    ].map(opt => (
                      <label key={opt} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="mt-1 w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.intervencoesRealizadas?.includes(opt) || false}
                          onChange={() => {
                            const list = formData.intervencoesRealizadas || [];
                            setFormData({
                              ...formData,
                              intervencoesRealizadas: list.includes(opt) ? list.filter((x: string) => x !== opt) : [...list, opt]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}
                    
                    <div className="md:col-span-2 pt-2 border-t border-gray-100 space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.intervencoesRealizadas?.includes("Outros") || false}
                          onChange={() => {
                            const list = formData.intervencoesRealizadas || [];
                            setFormData({
                              ...formData,
                              intervencoesRealizadas: list.includes("Outros") ? list.filter((x: string) => x !== "Outros") : [...list, "Outros"]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">Outros</span>
                      </label>
                      <input 
                        type="text" 
                        disabled={!formData.intervencoesRealizadas?.includes("Outros")}
                        className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm disabled:opacity-50"
                        placeholder="Especifique a intervenção secundária..."
                        value={formData.intervencoesRealizadasOutros || ""}
                        onChange={(e) => setFormData({...formData, intervencoesRealizadasOutros: e.target.value})}
                      />
                      
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Descrição Complementar das Intervenções</label>
                        <textarea 
                          rows={3}
                          className="w-full p-4 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm font-medium text-gray-700"
                          placeholder="Fale mais profundamente sobre a reunião, direcionamentos ou acordos efetuados..."
                          value={formData.descricaoComplementar || ""}
                          onChange={(e) => setFormData({...formData, descricaoComplementar: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. ENCAMINHAMENTOS */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">07</span>
                    Encaminhamentos Efetivados
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'Sem encaminhamento no momento',
                      'Encaminhamento ao serviço do AEE da unidade',
                      'Acompanhamento psicológico externo',
                      'Psiquiatria',
                      'Neurologia',
                      'Psicopedagogia',
                      'Assistência social',
                      'Reunião com família',
                      'Acompanhamento pedagógico',
                      'Rede de proteção'
                    ].map(opt => (
                      <label key={opt} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="mt-1 w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.encaminhamentos?.includes(opt) || false}
                          onChange={() => {
                            const list = formData.encaminhamentos || [];
                            setFormData({
                              ...formData,
                              encaminhamentos: list.includes(opt) ? list.filter((x: string) => x !== opt) : [...list, opt]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}
                    
                    <div className="md:col-span-2 pt-2 border-t border-gray-100 space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.encaminhamentos?.includes("Outros") || false}
                          onChange={() => {
                            const list = formData.encaminhamentos || [];
                            setFormData({
                              ...formData,
                              encaminhamentos: list.includes("Outros") ? list.filter((x: string) => x !== "Outros") : [...list, "Outros"]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">Outros</span>
                      </label>
                      <input 
                        type="text" 
                        disabled={!formData.encaminhamentos?.includes("Outros")}
                        className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm disabled:opacity-50"
                        placeholder="Especifique outros destinos..."
                        value={formData.encaminhamentosOutros || ""}
                        onChange={(e) => setFormData({...formData, encaminhamentosOutros: e.target.value})}
                      />
                      
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Descrição Detalhada do Encaminhamento</label>
                        <textarea 
                          rows={3}
                          className="w-full p-4 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm font-medium text-gray-700"
                          placeholder="Descreva detalhes ou observações dos encaminhamentos..."
                          value={formData.descricaoEncaminhamento || ""}
                          onChange={(e) => setFormData({...formData, descricaoEncaminhamento: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 8. ANEXOS */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">08</span>
                    Anexos Registrados
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'Relatório externo',
                      'Declaração',
                      'Registro pedagógico',
                      'Comunicação familiar'
                    ].map(opt => (
                      <label key={opt} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="mt-1 w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.anexos?.includes(opt) || false}
                          onChange={() => {
                            const list = formData.anexos || [];
                            setFormData({
                              ...formData,
                              anexos: list.includes(opt) ? list.filter((x: string) => x !== opt) : [...list, opt]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}
                    
                    <div className="md:col-span-2 pt-2 border-t border-gray-100 space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 text-pedagogic-blue rounded border-gray-300"
                          checked={formData.anexos?.includes("Outros") || false}
                          onChange={() => {
                            const list = formData.anexos || [];
                            setFormData({
                              ...formData,
                              anexos: list.includes("Outros") ? list.filter((x: string) => x !== "Outros") : [...list, "Outros"]
                            });
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700">Outros</span>
                      </label>
                      <input 
                        type="text" 
                        disabled={!formData.anexos?.includes("Outros")}
                        className="w-full px-4 py-2 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm disabled:opacity-50"
                        placeholder="Especifique outros tipos de anexos..."
                        value={formData.anexosOutros || ""}
                        onChange={(e) => setFormData({...formData, anexosOutros: e.target.value})}
                      />
                      
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Observações Sobre Anexos</label>
                        <textarea 
                          rows={3}
                          className="w-full p-4 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm font-medium text-gray-700"
                          placeholder="Registros detalhados de documentos externos anexados de forma física ou virtual..."
                          value={formData.observacoesAnexos || ""}
                          onChange={(e) => setFormData({...formData, observacoesAnexos: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 9. RESPONSÁVEL PELO ATENDIMENTO */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <h4 className="font-black text-sesi-blue text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-6 h-6 bg-sesi-blue text-white rounded-lg flex items-center justify-center text-[10px]">09</span>
                    Responsável pelo Atendimento
                  </h4>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pedagogic-blue outline-none text-sm font-semibold text-gray-700"
                    placeholder="Nome do profissional e conselho habilitante (se aplicável)"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                  />
                </div>

              </div>

              {/* Form Buttons */}
              <div className="shrink-0 pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-6 py-3 bg-pedagogic-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-800 disabled:opacity-50 transition-all"
                >
                  {saving ? "Salvando..." : "Salvar Atendimento AEE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// StudentSelector Replicating core behavior inside AtendimentoAee.tsx to keep it totally self-contained and compiled correctly
const StudentSelector = ({ students, schools, onSelect, selectedStudent, onRefresh }: any) => {
  const [filters, setFilters] = useState({
    ra: selectedStudent?.ra || "",
    name: selectedStudent?.name || "",
    class: selectedStudent?.class || "",
    schoolId: selectedStudent?.schoolId || "",
  });

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    name: "",
    ra: "",
    class: "",
    schoolId: "",
  });
  const [savingQuick, setSavingQuick] = useState(false);

  useEffect(() => {
    if (selectedStudent) {
      setFilters({
        ra: selectedStudent.ra,
        name: selectedStudent.name,
        class: selectedStudent.class,
        schoolId: selectedStudent.schoolId,
      });
    } else {
      setFilters({ ra: "", name: "", class: "", schoolId: "" });
    }
  }, [selectedStudent]);

  const filtered = students.filter((s: any) => {
    return (!filters.ra || s.ra?.toLowerCase().includes(filters.ra.toLowerCase())) &&
           (!filters.name || s.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
           (!filters.class || s.class?.toLowerCase().includes(filters.class.toLowerCase())) &&
           (!filters.schoolId || s.schoolId === filters.schoolId);
  });

  const hasActiveSearch = filters.ra.length > 2 || filters.name.length > 2 || filters.class.length > 1;

  const handleSelect = (s: any) => {
    onSelect(s);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddForm.name || !quickAddForm.schoolId) {
      alert("Nome e Unidade são obrigatórios.");
      return;
    }

    setSavingQuick(true);
    try {
      const selectedSchoolRecord = schools.find((sch: any) => sch.id === quickAddForm.schoolId);
      const unitName = (selectedSchoolRecord?.unit || selectedSchoolRecord?.name || "").toUpperCase();

      const newPerson = await api.students.create({
        ...quickAddForm,
        age: 0,
        studentType: 'external',
        schoolYear: new Date().getFullYear().toString(),
        unit: unitName,
        schoolUnit: unitName,
        observations: "Cadastro rápido via emissão de documento"
      });
      
      if (onRefresh) await onRefresh();
      
      onSelect(newPerson);
      setShowQuickAdd(false);
      setQuickAddForm({ name: "", ra: "", class: "", schoolId: "" });
    } catch (err: any) {
      alert("Erro ao realizar cadastro rápido: " + err.message);
    } finally {
      setSavingQuick(false);
    }
  };

  const getSchoolName = (id: string) => schools.find((s: any) => s.id === id)?.name || "Unidade não encontrada";

  return (
    <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
      <div className="flex items-center justify-between px-1">
        <h5 className="text-[10px] font-black uppercase text-sesi-blue tracking-widest">Localizar Registro</h5>
        <button 
          type="button"
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${showQuickAdd ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-sesi-blue text-white hover:bg-blue-800 shadow-lg shadow-blue-100'}`}
        >
          {showQuickAdd ? <X size={14} /> : <PlusCircle size={14} />}
          {showQuickAdd ? 'Cancelar Cadastro' : 'Cadastrar Pessoa Nova'}
        </button>
      </div>

      {showQuickAdd ? (
        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <p className="text-xs font-bold text-gray-500 mb-4 flex items-center gap-2">
            <UserPlus size={14} className="text-sesi-blue" />
            Cadastro Rápido (Se não encontrado na busca)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Nome Completo</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sesi-blue outline-none"
                value={quickAddForm.name}
                onChange={(e) => setQuickAddForm({...quickAddForm, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">RA / CPF / Matrícula</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sesi-blue outline-none"
                placeholder="Ex: 123456"
                value={quickAddForm.ra}
                onChange={(e) => setQuickAddForm({...quickAddForm, ra: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Série / Turma</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sesi-blue outline-none"
                placeholder="Ex: 3º Ano A"
                value={quickAddForm.class}
                onChange={(e) => setQuickAddForm({...quickAddForm, class: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Unidade / Escola Liberada</label>
              <select 
                required
                className="w-full px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sesi-blue outline-none"
                value={quickAddForm.schoolId}
                onChange={(e) => setQuickAddForm({...quickAddForm, schoolId: e.target.value})}
              >
                <option value="">Selecione a unidade...</option>
                {schools.map((sk: any) => (
                  <option key={sk.id} value={sk.id}>{sk.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button 
                type="button"
                onClick={handleQuickAdd}
                disabled={savingQuick}
                className="px-5 py-2.5 bg-pedagogic-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-blue-800 disabled:opacity-50"
              >
                {savingQuick ? 'Cadastrando...' : 'Confirmar e Selecionar'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Filtrar por RA</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sesi-blue outline-none bg-white font-medium"
                placeholder="Ex: 5543..."
                value={filters.ra}
                onChange={(e) => setFilters({...filters, ra: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Filtrar por Nome do Aluno</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sesi-blue outline-none bg-white font-medium"
                placeholder="Comece a digitar o nome..."
                value={filters.name}
                onChange={(e) => setFilters({...filters, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Unidade Escolar</label>
              <select 
                className="w-full px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sesi-blue outline-none bg-white font-medium text-gray-600 cursor-pointer"
                value={filters.schoolId}
                onChange={(e) => setFilters({...filters, schoolId: e.target.value})}
              >
                <option value="">Todas as unidades...</option>
                {schools.map((sk: any) => (
                  <option key={sk.id} value={sk.id}>{sk.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible/Expandable matching search list */}
          {hasActiveSearch && (
            <div className="bg-white border rounded-xl divide-y overflow-hidden shadow-sm max-h-48 overflow-y-auto animate-in slide-in-from-top-1 duration-200">
              {filtered.length === 0 ? (
                <p className="p-4 text-xs font-bold text-gray-400 text-center uppercase tracking-wider">Nenhum aluno encontrado na busca</p>
              ) : (
                filtered.map((s: any) => (
                  <button 
                    key={s.id} 
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="w-full px-5 py-3 hover:bg-blue-50/50 text-left flex items-center justify-between text-sm transition-colors"
                  >
                    <div>
                      <span className="font-bold text-gray-800">{s.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({getSchoolName(s.schoolId)})</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                      <span>RA: {s.ra || 'N/D'}</span>
                      <span>Turma: {s.class || 'N/D'}</span>
                      <span className="text-pedagogic-blue font-extrabold uppercase text-[10px] tracking-wider">Selecionar &rarr;</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Currently Selected Card */}
          {selectedStudent ? (
            <div className="bg-white border-2 border-emerald-500/20 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-emerald-50/50 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Aluno Selecionado</p>
                  <p className="text-sm font-bold text-gray-800">{selectedStudent.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-gray-500">
                <p className="flex items-center gap-1.5"><Briefcase size={14} className="text-gray-400" /> RA: <strong className="text-gray-700">{selectedStudent.ra || 'N/D'}</strong></p>
                <p className="flex items-center gap-1.5"><GraduationCap size={14} className="text-gray-400" /> Turma: <strong className="text-gray-700">{selectedStudent.class || 'N/D'}</strong></p>
                <p className="flex items-center gap-1.5"><School size={14} className="text-gray-400" /> Escola: <strong className="text-gray-700">{getSchoolName(selectedStudent.schoolId)}</strong></p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/50 border border-dashed border-amber-300 rounded-xl text-center text-amber-600 text-xs font-semibold animate-pulse">
              Selecione um aluno acima digitando ra ou nome para gerar a Ficha de Atendimento.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const isSuperUser = (user: any) => {
  if (!user) return false;
  const email = user?.email?.toLowerCase();
  const superEmails = ['maykon.euro@gmail.com', 'administrador@exemplo.com', 'administrador@sgepsicologia.com'];
  return user?.role === 'super-admin' || user?.role === 'admin' || user?.id === 'super_admin' || superEmails.includes(email);
};
