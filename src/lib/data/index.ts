/**
 * Punto único de acceso a datos de la UI (la "costura").
 *
 * Hoy devuelve datos mock. Para conectar Supabase: crear `supabase.ts` con
 * estas mismas funciones (leyendo con RLS del usuario) y cambiar los imports
 * de aquí. Ningún componente de UI necesita cambiar.
 */
import {
  mockApprovals,
  mockAppointments,
  mockChannels,
  mockMessages,
  mockOutbox,
  mockReminders,
  mockStats,
  mockUsage,
  mockUser,
} from './mock';

export const getCurrentUser = async () => mockUser;
export const getChannels = async () => mockChannels;
export const getInbox = async () => mockMessages;
export const getOutbox = async () => mockOutbox;
export const getApprovals = async () => mockApprovals;
export const getAppointments = async () => mockAppointments;
export const getReminders = async () => mockReminders;
export const getUsage = async () => mockUsage;
export const getStats = async () => mockStats;

export * from './types';
