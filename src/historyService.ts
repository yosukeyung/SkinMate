import { supabase } from './supabaseClient';
import { getUser } from './auth';

const BUCKET = 'scan-images';

/**
 * Uploads a base64 dataURL image to Supabase Storage.
 * Returns the public URL, or falls back to the original base64 if upload fails.
 */
export async function uploadScanImage(base64DataUrl: string, scanId: string): Promise<string> {
  try {
    // Convert base64 dataURL → Blob
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    const filePath = `${scanId}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      console.warn('Storage upload failed, using base64 fallback:', error.message);
      return base64DataUrl;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (e) {
    console.warn('uploadScanImage error, using base64 fallback:', e);
    return base64DataUrl;
  }
}


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
