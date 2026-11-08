#!/usr/bin/env bash
# skiller launcher: installs missing dependencies (Node, GitHub CLI, gh login), then runs skiller.mjs.
DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="$PATH:/c/Program Files/nodejs:/c/Program Files/GitHub CLI:/opt/homebrew/bin:/usr/local/bin"
have() { command -v "$1" >/dev/null 2>&1; }

install() { # $1 = node | gh
  echo "⏳ Installo $1..."
  if have winget; then
    local id; [ "$1" = node ] && id=OpenJS.NodeJS.LTS || id=GitHub.cli
    winget install --id "$id" -e --silent --accept-source-agreements --accept-package-agreements >/dev/null 2>&1
  elif have brew; then
    brew install "$1" >/dev/null 2>&1
  elif have apt-get && sudo -n true 2>/dev/null; then
    [ "$1" = node ] && sudo -n apt-get install -y nodejs >/dev/null 2>&1 || sudo -n apt-get install -y gh >/dev/null 2>&1
  fi
  local bin; [ "$1" = node ] && bin=node || bin=gh
  have "$bin" && echo "✅ $1 installato" || { echo "❌ Non riesco a installare $1 da solo. Installalo da $( [ "$1" = node ] && echo https://nodejs.org || echo https://cli.github.com ) e riprova."; exit 0; }
}

have node || install node
have gh || install gh

if ! gh auth status -h github.com >/dev/null 2>&1; then
  LOG="$(mktemp)"
  echo | gh auth login -h github.com -p https --web >"$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 20); do grep -q "code" "$LOG" && break; sleep 0.5; done
  CODE="$(grep -o '[A-Z0-9]\{4\}-[A-Z0-9]\{4\}' "$LOG" | head -1)"
  URL=https://github.com/login/device
  { have cmd.exe && cmd.exe /c start "" "$URL"; } >/dev/null 2>&1 || { have open && open "$URL"; } || { have xdg-open && xdg-open "$URL"; } >/dev/null 2>&1
  echo "🔑 Collega GitHub: nel browser che si è aperto ($URL) incolla il codice **$CODE** (è già negli appunti, Ctrl+V) e clicca Authorize.""
  wait "$PID"
  gh auth status -h github.com >/dev/null 2>&1 && echo "✅ GitHub collegato" || { echo "❌ Accesso a GitHub non completato. Rilancia il comando."; exit 0; }
fi

node "$DIR/skiller.mjs" "$@"
