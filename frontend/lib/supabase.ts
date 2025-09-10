import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tkfyuoimvcizydsgqrkj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrZnl1b2ltdmNpenlkc2dxcmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNzIxMjMsImV4cCI6MjA3MTk0ODEyM30.rHlbRnZV269b7-MQk0Xk7wPws9rXYATIIiCjOYuBx-c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
