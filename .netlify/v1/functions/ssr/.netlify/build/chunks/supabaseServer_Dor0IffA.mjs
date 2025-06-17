import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://hmkxkttrchnupwrcdtyo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhta3hrdHRyY2hudXB3cmNkdHlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3Mjc2OTcsImV4cCI6MjA2NTMwMzY5N30.IdhG3yoAerc3Lxrn14CAOHpdb9SzNdGP3ANiKEpavDc"
);

export { supabase as s };
