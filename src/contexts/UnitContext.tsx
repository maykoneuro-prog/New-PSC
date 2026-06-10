import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface UnitContextType {
  activeUnit: string;
  setActiveUnit: (unit: string) => void;
  availableUnits: string[];
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export function UnitProvider({ children, user }: { children: React.ReactNode, user: any }) {
  const [dynamicUnits, setDynamicUnits] = useState<string[]>([]);
  const [activeUnit, setActiveUnit] = useState<string>(() => {
    const saved = localStorage.getItem('activeUnit');
    if (saved === 'Sede') return 'Administração Central';
    return saved || (user?.units?.[0] || 'Administração Central');
  });

  const isSuper = (() => {
    if (!user) return false;
    const email = user?.email?.toLowerCase();
    const superEmails = ['maykon.euro@gmail.com', 'administrador@sgepsicologia.com'];
    return user?.role === 'super-admin' || user?.role === 'admin' || user?.id === 'super_admin' || superEmails.includes(email);
  })();
  const isAdminWithoutUnits = user?.role === 'admin' && (!user?.units || user.units.length === 0);

  // Fetch schools to populate available units
  useEffect(() => {
    if (user) {
      const loadUnits = async () => {
        try {
          if (isSuper || isAdminWithoutUnits) {
            const schools = await api.schools.list({ isAdmin: true });
            if (schools) {
              const units = schools.map((s: any) => s.unit || s.name).filter(Boolean);
              setDynamicUnits(units);
            }
          } else {
            // Psychologists/Others - only fetch what they own or have access to
            const schools = await api.schools.list({ isAdmin: false });
            if (schools) {
              const allowedUnits = (user?.units || []).map((u: string) => u.trim().toUpperCase());
              const units = schools
                .filter((s: any) => {
                  const isOwner = s.ownerId === user?.id || s.ownerId === user?.uid;
                  if (isOwner) return true;
                  
                  const sUnit = (s.unit || s.name || "").trim().toUpperCase();
                  if (!sUnit) return false;
                  
                  return allowedUnits.some(u => {
                    const cleanAllowed = u.replace(/^(SESI|UNIDADE|ESCOLA|CENTRO|DEPARTAMENTO)\s+/gi, "").trim();
                    const cleanRequested = sUnit.replace(/^(SESI|UNIDADE|ESCOLA|CENTRO|DEPARTAMENTO)\s+/gi, "").trim();
                    return u === sUnit || (cleanAllowed !== "" && cleanAllowed === cleanRequested);
                  });
                })
                .map((s: any) => s.unit || s.name)
                .filter(Boolean);
              setDynamicUnits(units);
            }
          }
        } catch (err) {
          console.error("Error loading schools for units:", err);
        }
      };
      loadUnits();
    }
  }, [user, isSuper, isAdminWithoutUnits]);
  
  const availableUnits = React.useMemo(() => {
    const baseUnits = (isSuper || isAdminWithoutUnits) ? ['Administração Central'] : [];
    const userUnits = [...baseUnits, ...(user?.units || []), ...dynamicUnits];
    return Array.from(new Set(userUnits)).filter(Boolean) as string[];
  }, [isSuper, isAdminWithoutUnits, user?.units, dynamicUnits]);

  useEffect(() => {
    localStorage.setItem('activeUnit', activeUnit);
  }, [activeUnit]);

  // Handle unit switching if user loses access to current unit or logs in
  useEffect(() => {
    if (user && availableUnits.length > 0 && !availableUnits.includes(activeUnit)) {
      setActiveUnit(availableUnits[0]);
    }
  }, [user, availableUnits]);

  return (
    <UnitContext.Provider value={{ activeUnit, setActiveUnit, availableUnits }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}
