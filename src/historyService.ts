import { supabase } from './supabaseClient';
import { getUser } from './auth';

export type ScanHistoryItem = {
  id: string;
  image: string;
  skinType: string;
  skinTypeDesc: string;
  acneType: string;
  acneTypeDesc: string;
  overallCondition: string;
  skincareTips: string[];
  confidence: number;
  date: string;
  isDemo?: boolean;
  aiResultJson?: any;
};

export async function fetchUserHistory(): Promise<ScanHistoryItem[]> {
  const user = getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from('scan_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching history:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    image: row.image,
    skinType: row.skin_type,
    skinTypeDesc: row.skin_type_desc,
    acneType: row.acne_type,
    acneTypeDesc: row.acne_type_desc,
    overallCondition: row.overall_condition,
    skincareTips: row.skincare_tips,
    confidence: row.confidence,
    isDemo: row.is_demo,
    aiResultJson: row.ai_result_json,
    date: row.created_at
  }));
}

export async function deleteHistoryItem(id: string): Promise<boolean> {
  const user = getUser();
  if (!user?.id) return false;

  const { error } = await supabase
    .from('scan_history')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting item:', error);
    return false;
  }
  return true;
}
