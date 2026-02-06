#!/bin/bash
set -e

echo -e "\033[0;36m== Supabase Safe DB Push ==\033[0m"

supabase --version

echo -e "\n\033[0;33m[1/3] Checking link + status...\033[0m"
supabase status

echo -e "\n\033[0;33m[2/3] Showing target project ref (from supabase link)...\033[0m"
if [ -f ".supabase/config.toml" ]; then
  grep -E "project_ref|project_id" .supabase/config.toml
else
  echo -e "\033[0;31mNo .supabase/config.toml found. Did you run 'supabase link'?\033[0m"
  exit 1
fi

echo -e "\n\033[0;31m[3/3] Type YES to confirm DB push to REMOTE\033[0m"
read -p "Confirm: " confirm

if [ "$confirm" != "YES" ]; then
  echo -e "\033[0;90mCancelled.\033[0m"
  exit 0
fi

echo -e "\n\033[0;32mRunning: supabase db push\033[0m"
supabase db push

echo -e "\n\033[0;32mDone.\033[0m"
