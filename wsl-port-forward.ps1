# Run this in PowerShell as Administrator on Windows
# This script sets up port forwarding from Windows to WSL2

$wslIp = "172.30.59.74"  # Your current WSL2 IP
$port = 5000

# Remove existing port forwarding if it exists
netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0

# Add new port forwarding
netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp

# Add firewall rule
New-NetFirewallRule -DisplayName "WSL2 Avatar HC Port $port" -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

Write-Host "Port forwarding configured for port $port"
Write-Host "WSL IP: $wslIp"
Write-Host "You can now access the app at http://localhost:$port"

# Show current port forwarding rules
Write-Host "`nCurrent port forwarding rules:"
netsh interface portproxy show v4tov4
