// assets/js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://eymqvzjwbolgmywpwhgi.supabase.co'; // paste from Supabase settings
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bXF2emp3Ym9sZ215d3B3aGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTE3ODMsImV4cCI6MjA3MjEyNzc4M30.LyZaqNhXbHqn3chEb-titqrh5DVmDG5L0XoTasEeZ00';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
window.sb = sb; // handy for testing in console
