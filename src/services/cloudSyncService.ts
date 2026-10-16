import type { InspectionReport } from '../types/inspection';
import { getSupabaseClient } from './supabaseClient';
import { saveReport } from './storageService';
import type { User } from '@supabase/supabase-js';

export interface CloudSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
}

export async function syncReportToCloud(
  report: InspectionReport,
  user: User | null = null
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Cloud database not connected.' };
  }

  try {
    const payload = {
      id: report.id,
      user_id: user ? user.id : null,
      user_email: user ? (user.email || 'authenticated-user') : 'team-shared',
      property_address: report.propertyAddress || 'Untitled Property',
      report_json: report,
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from('inspections')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Failed to sync report to Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Exception syncing report to Supabase:', err);
    return { success: false, error: msg };
  }
}

export async function fetchReportsFromCloud(): Promise<{
  reports: InspectionReport[];
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { reports: [], error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('inspections')
      .select('id, property_address, report_json, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Error fetching reports from Supabase:', error.message);
      return { reports: [], error: error.message };
    }

    const cloudReports: InspectionReport[] = [];
    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.report_json) {
          const report = row.report_json as InspectionReport;
          cloudReports.push(report);
          // Mirror to local IndexedDB for fast offline retrieval
          await saveReport(report).catch(() => {});
        }
      }
    }

    return { reports: cloudReports, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { reports: [], error: msg };
  }
}

export async function deleteReportFromCloud(
  reportId: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not initialized.' };
  }

  try {
    const { error } = await client
      .from('inspections')
      .delete()
      .eq('id', reportId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
