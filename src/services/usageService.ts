import { api } from "../lib/api";
import { format, startOfMonth } from "date-fns";

export interface Plan {
  id: string;
  name: string;
  limit: number;
  price: number;
  allowOverage: boolean;
  autoBlock: boolean;
}

export interface UsageStatus {
  current: number;
  limit: number;
  percentage: number;
  isSoftLimit: boolean; // 80%
  isHardLimit: boolean; // 100%
  isExceeded: boolean; // > 100%
  shouldBlock: boolean;
  message: string | null;
}

export const usageService = {
  getMonthlyUsage: async (unitId: string, professionalId?: string): Promise<number> => {
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      // Use YYYY-MM-DD to avoid time-of-day filtering issues in string comparison
      const monthStartStr = format(monthStart, 'yyyy-MM-01');

      const savedUser = localStorage.getItem("user");
      const currentUser = savedUser ? JSON.parse(savedUser) : null;
      const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super-admin';
      const isTrial = currentUser?.planId === 'trial' || currentUser?.isTrial;

      const filters: any = { startDate: monthStartStr, isAdmin };
      if (professionalId && (!isAdmin || isTrial)) {
        filters.professionalId = professionalId;
      }

      const [appointments, documents] = await Promise.all([
        api.appointments.list(filters),
        api.documents.list(filters)
      ]);

      const isCentral = unitId === 'Sede' || unitId === 'Administração Central';
      const cleanSelected = unitId.trim().toLowerCase().replace(/^(sesi|unidade|escola|centro|departamento)\s+/g, "").trim();

      const matchesUnit = (item: any) => {
        if (isCentral) return true;
        
        const val = (item.unit || item.schoolUnit || "").trim().toLowerCase();
        const cleanVal = val.replace(/^(sesi|unidade|escola|centro|departamento)\s+/g, "").trim();
        
        // Match exact or contains (symmetric)
        if (val === unitId.trim().toLowerCase() || cleanVal === cleanSelected) return true;
        if (cleanSelected !== "" && cleanVal.includes(cleanSelected)) return true;
        if (cleanVal !== "" && cleanSelected.includes(cleanVal)) return true;
        
        return false;
      };

      const filteredAppointments = (appointments || []).filter(matchesUnit);

      // Count ALL clinical/pedagogical documents as usage
      const relevantDocumentTypes = [
        'group_attendance', 
        'pedagogical_participation', 
        'psychological_listening', 
        'school_diagnosis',
        'classroom_evolution',
        'referral',
        'attendance_declaration',
        'authorization_term'
      ];
      
      const filteredDocuments = (documents || []).filter((doc: any) => {
        const docMatchesUnit = matchesUnit(doc);
        const isRelevantType = relevantDocumentTypes.includes(doc.type);
        return docMatchesUnit && isRelevantType;
      });

      return filteredAppointments.length + filteredDocuments.length;
    } catch (error) {
      console.error("Error calculating usage:", error);
      return 0;
    }
  },

  getSubscriptionStatus: async (unitId: string, professionalId?: string): Promise<UsageStatus | null> => {
    try {
      const currentUsage = await usageService.getMonthlyUsage(unitId, professionalId);

      return {
        current: currentUsage,
        limit: 999999, // Unlimited display
        percentage: 0,
        isSoftLimit: false,
        isHardLimit: false,
        isExceeded: false,
        shouldBlock: false,
        message: null
      };
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      return {
        current: 0,
        limit: 999999,
        percentage: 0,
        isSoftLimit: false,
        isHardLimit: false,
        isExceeded: false,
        shouldBlock: false,
        message: null
      };
    }
  },

  logUsage: async (unitId: string, action: string, details: string) => {
    await api.usageLogs.create({
      unitId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  },

  checkAndExecuteAction: async (unitId: string, action: () => Promise<any>, actionName: string): Promise<any> => {
    // Plan use controls are retired, never block actions
    const result = await action();
    
    // Log success
    try {
      await usageService.logUsage(unitId, actionName, "Sucesso");
    } catch (e) {
      console.warn("Could not log usage:", e);
    }
    
    return result;
  }
};
