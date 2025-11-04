# =========================
# Lancer Backend + Tunnel
# =========================

# 1) Aller dans le dossier backend et activer le venv
cd "C:\Users\Pimprenelle\Documents\LymphTrackApp\backend"
.\venv\Scripts\activate

# 2) Démarrer le backend FastAPI en arrière-plan (fenêtre minimisée)
Start-Process powershell -ArgumentList "uvicorn app.main:app --host 0.0.0.0 --port 8000" -WindowStyle Minimized

# 3) Attendre 10s que le backend soit prêt
Start-Sleep -Seconds 10

# 4) Démarrer le tunnel localtunnel en HTTPS en boucle (si ça coupe, il redémarre)
$cmd = "lt --port 8000 --subdomain lymphtrack"
while ($true) {
    Start-Process powershell -ArgumentList $cmd -WindowStyle Minimized -Wait
    Start-Sleep -Seconds 2
}
