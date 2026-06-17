import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivbezuedjwxgldlqouwi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2YmV6dWVkand4Z2xkbHFvdXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzE4NjksImV4cCI6MjA5NzIwNzg2OX0.CqB_qDU6kqRiT1I43ooiR3yqW3KpFFhM6vScGYjc49w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
