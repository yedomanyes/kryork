import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivbezuedjwxgldlqouwi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_auJgUDw2Wt8GCgoWwaZg9Q_Wj6voO3O';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
