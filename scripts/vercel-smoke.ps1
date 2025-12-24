 =  ? \ /api/health\ : \https://zaza-draft-28d67g61r.vercel.app/api/health\
Write-Output \Checking \
try {
   = Invoke-RestMethod -Uri  -UseBasicParsing -Method Get
  if (.status -eq 'ok') {
    Write-Output \Health check passed\
    if (.firestore) {
      Write-Output \Firestore status: \
    }
  } else {
    Write-Output \Health degraded: \
    Write-Output \Missing envs:  \
    Write-Output \Next steps: verify env vars on Vercel, ensure Firebase Admin credentials are set, and rerun upgrade.\
    exit 1
  }
} catch {
  Write-Error \Health check failed: \
  Write-Output \Next steps: ensure the deployment is healthy and the health endpoint is reachable.\
  exit 1
}
