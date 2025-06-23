import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, viewing_student_screen, is_online, last_seen } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    // Update participant status in Supabase
    const { error } = await supabase
      .from('participants')
      .update({
        viewing_student_screen: viewing_student_screen !== undefined ? viewing_student_screen : false,
        is_online: is_online !== undefined ? is_online : false,
        last_seen: last_seen || new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating participant status:', error);
      return res.status(500).json({ error: 'Failed to update participant status' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in update-status API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
