// assets/js/supabase.js
// Use esm.sh instead of jsDelivr +esm (which is currently broken)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = 'https://eymqvzjwbolgmywpwhgi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bXF2emp3Ym9sZ215d3B3aGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTE3ODMsImV4cCI6MjA3MjEyNzc4M30.LyZaqNhXbHqn3chEb-titqrh5DVmDG5L0XoTasEeZ00';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// keep the global for your existing code / console debugging
window.sb = sb;

console.log('[supabase.js] sb initialized?', !!sb);
