import React, { useState, useEffect } from "react";
import { Search, User, School, Calendar as CalendarIcon, ArrowLeft, ClipboardList, Info, ChevronRight, X } from "lucide-react";
import { api } from "../lib/api";
import Documents from "./Documents";
import { useUnit } from "../contexts/UnitContext";

export default function RegistrosEstudantes({ user }: { user: any }) {
  const { activeUnit } = useUnit();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [schoolsList, setSchoolsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    loadSchools();
  }, [activeUnit]);

  // If active student gets updated, or unit changes, clear if not matching
  useEffect(() => {
    if (selectedStudent) {
      // Clear selected student if unit changes and we lose access, or just reload school lists
      loadSchools();
    }
  }, [activeUnit]);

  const loadSchools = async () => {
    try {
      const email = user?.email?.toLowerCase() || "";
      const isSuperAdmin =
        user?.role === "super-admin" ||
        user?.role === "admin" ||
        user?.id === "super_admin" ||
        email === "maykon.euro@gmail.com" ||
        email.includes("administrador");
      const allowedUnits = user?.units || [];

      const schoolsData = await api.schools.list({
        isAdmin: isSuperAdmin,
        allowedUnits,
      });
      setSchoolsList(schoolsData || []);
    } catch (err) {
      console.error("[RegistrosEstudantes] Erro ao carregar escolas:", err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!search.trim()) {
      setStudents([]);
      return;
    }

    setLoading(true);
    try {
      const email = user?.email?.toLowerCase() || "";
      const isSuperAdmin =
        user?.role === "super-admin" ||
        user?.role === "admin" ||
        user?.id === "super_admin" ||
        email === "maykon.euro@gmail.com" ||
        email.includes("administrador");
      const cleanUnit = activeUnit?.trim().toUpperCase();
      const isCentral = isSuperAdmin && ["ADMINISTRAÇÃO CENTRAL", "SEDE"].includes(cleanUnit);
      const allowedUnits = user?.units || [];

      // Fetch all students matching active unit
      const studentsData = await api.students.list({
        unit: isCentral ? undefined : activeUnit,
        isAdmin: isSuperAdmin,
        allowedUnits,
      });

      // Filter local results based on active unit, access permissions, and search criteria
      const results = (studentsData || []).filter((s: any) => {
        const sFromId = schoolsList.find((sch: any) => sch.id === s.schoolId);

        // Security validation
        if (!isSuperAdmin) {
          const isOwner = s.ownerId === user?.id || s.ownerId === user?.uid;
          const isProfessional = s.professionalId === user?.id || s.professionalId === user?.uid;

          const userUnits = (user?.units || []).map((u: string) => String(u).trim().toUpperCase());
          const studentUnit = String(s.unit || s.schoolUnit || sFromId?.unit || sFromId?.name || "").trim().toUpperCase();

          const hasUnitAccess = studentUnit !== "" && userUnits.some((u: string) => {
            const cleanAllowed = u.replace(/^(SESI|UNIDADE|ESCOLA|CENTRO|DEPARTAMENTO)\s+/gi, "").trim();
            const cleanItem = studentUnit.replace(/^(SESI|UNIDADE|ESCOLA|CENTRO|DEPARTAMENTO)\s+/gi, "").trim();
            return studentUnit === u || (cleanAllowed !== "" && cleanAllowed === cleanItem);
          });

          if (!isOwner && !isProfessional && !hasUnitAccess) return false;
        }

        // Search matches Name, RA or Class
        const matchesSearch =
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.ra && s.ra.toLowerCase().includes(search.toLowerCase())) ||
          (s.class && s.class.toLowerCase().includes(search.toLowerCase()));

        return matchesSearch;
      });

      setStudents(results);
    } catch (err) {
      console.error("[RegistrosEstudantes] Erro ao buscar estudantes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run automatic search when search string changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const getSchoolName = (id: string) => {
    return schoolsList.find((s) => s.id === id)?.name || "Escola não informada";
  };

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        {/* Student header navigation card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedStudent(null)}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all border border-slate-100 active:scale-95 flex items-center justify-center"
              title="Voltar para busca"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-pedagogic-blue/10 text-pedagogic-blue px-2.5 py-1 rounded-lg">
                  Estudante Selecionado
                </span>
                {selectedStudent.ra && (
                  <span className="text-[10px] font-mono text-slate-400">
                    RA: {selectedStudent.ra}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1.5">
                {selectedStudent.name}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                <span className="font-bold text-slate-600">{selectedStudent.class || "Sem turma"}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <School size={12} className="text-slate-400" />
                  {getSchoolName(selectedStudent.schoolId)}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedStudent(null)}
            className="self-start md:self-auto px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl transition-all border border-slate-100"
          >
            Mudar Estudante
          </button>
        </div>

        {/* Render Documents in embedded mode for this selected student */}
        <div className="animate-in fade-in duration-500">
          <Documents user={user} embeddedStudentId={selectedStudent.id} isEmbedded={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Title block */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex p-3 bg-pedagogic-blue/10 text-pedagogic-blue rounded-[2rem] border-4 border-white shadow-xl shadow-blue-50">
          <ClipboardList size={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          Registros por Estudante
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Pesquise e selecione um estudante para criar, gerenciar e revisar todos os seus registros de atendimento, diagnósticos, termos e evoluções.
        </p>
      </div>

      {/* Clean Search Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            className="w-full pl-12 pr-24 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-pedagogic-blue/20 focus:border-pedagogic-blue text-base text-gray-800 placeholder-slate-400 transition-all font-medium"
            placeholder="Digite o nome, RA ou turma do estudante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="absolute right-2 top-2 px-6 py-2.5 bg-pedagogic-blue text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-blue-600 active:scale-95 transition-all shadow-md shadow-blue-100"
          >
            Buscar
          </button>
        </form>

        {/* Clear Search helper */}
        {search && (
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Resultados para: <strong className="text-slate-600">"{search}"</strong></span>
            <button
              onClick={() => {
                setSearch("");
                setStudents([]);
              }}
              className="text-pedagogic-rose hover:underline flex items-center gap-1 font-bold"
            >
              <X size={12} /> Limpar busca
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-pedagogic-blue rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Buscando estudantes...</p>
        </div>
      )}

      {/* Results grid */}
      {!loading && search.trim() !== "" && (
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
            Estudantes Encontrados ({students.length})
          </h2>

          {students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-pedagogic-blue/20 hover:shadow-lg hover:shadow-slate-100/50 cursor-pointer transition-all duration-300 group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-bold shrink-0 group-hover:bg-pedagogic-blue/5 group-hover:text-pedagogic-blue transition-colors">
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.name}
                          className="w-full h-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-extrabold text-slate-700 truncate group-hover:text-pedagogic-blue transition-colors">
                        {student.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                        <span className="font-bold text-slate-500">{student.class || "Sem turma"}</span>
                        <span>•</span>
                        <span className="truncate">{getSchoolName(student.schoolId)}</span>
                      </p>
                      {student.ra && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">RA: {student.ra}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 group-hover:bg-pedagogic-blue group-hover:text-white rounded-xl transition-colors text-slate-400 shrink-0">
                    <ChevronRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3 shadow-sm max-w-lg mx-auto">
              <div className="inline-flex p-3 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100">
                <Info size={24} />
              </div>
              <h3 className="font-bold text-slate-700">Nenhum estudante encontrado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Não localizamos nenhum estudante com os critérios digitados na sua unidade ativa. Certifique-se de digitar o nome completo ou RA corretamente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Default State (When no search has been entered) */}
      {!loading && !search.trim() && (
        <div className="bg-slate-50/50 p-12 rounded-3xl border-2 border-dashed border-slate-200/60 text-center space-y-3 max-w-lg mx-auto">
          <div className="inline-flex p-3.5 bg-white text-slate-400 rounded-[1.5rem] shadow-sm border border-slate-100">
            <Search size={22} className="text-pedagogic-blue/50" />
          </div>
          <h3 className="font-extrabold text-slate-600">Busca Rápida de Estudantes</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Inicie digitando no campo acima para pesquisar estudantes na unidade ativa <strong>{activeUnit}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
