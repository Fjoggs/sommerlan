#!/bin/bash
TOKEN=$1
if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <bot-token>"
  exit 1
fi

DB=/home/fjogen/projects/sommerlan/backend/sommerlan.db

sqlite3 "$DB" "SELECT id, name, discord_id FROM user WHERE discord_id IS NOT NULL ORDER BY id;" | while IFS='|' read -r id name discord_id; do
  response=$(curl -s -H "Authorization: Bot $TOKEN" "https://discord.com/api/v10/users/$discord_id")
  username=$(echo "$response" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('global_name') or d.get('username','ERROR'))" 2>/dev/null)
  printf "%-4s %-16s -> %s\n" "$id" "$name" "$username"
done
