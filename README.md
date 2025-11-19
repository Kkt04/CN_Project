# Network Configuration Auditor

A comprehensive full-stack application for auditing and managing OpenWRT virtual routers through SSH. Monitor network devices, control access, and perform security audits.

## 📋 File Structure

```
network-config-auditor/
│
├── backend/
│   ├── server.js              # Express Node.js server
│   ├── app.py                 # Flask Python server (alternative)
│   ├── package.json           # Node.js dependencies
│   ├── requirements.txt        # Python dependencies
│   ├── .env                   # Environment variables
│   └── .gitignore
│
├── frontend/
│   ├── public/
│   │   └── index.html         # Main HTML
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   └── index.js           # React entry point
│   ├── package.json           # Frontend dependencies
│   └── .env                   # Frontend env
│
├── README.md                  # This file
└── .gitignore                 # Git ignore rules
```

## 🚀 Quick Start

### 1. Backend Setup (Choose One)

#### Option A: Node.js Backend

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:3001`

#### Option B: Python Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server runs on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

### 3. Connect to Router

1. Open http://localhost:3000
2. Enter router connection details:
   - **Host**: `192.168.1.254` (your router IP)
   - **Port**: `22` (SSH port)
   - **Username**: `root`
   - **Password**: [your password]
3. Click **Connect to Router**

## 📁 Files Description

### Backend Files

- **server.js**: Express server with SSH2 client for Node.js
- **app.py**: Flask server with Paramiko for Python
- **package.json**: Node.js dependencies (express, cors, ssh2)
- **requirements.txt**: Python dependencies (Flask, Paramiko, etc.)
- **.env**: Environment variables (PORT, LOG_LEVEL, etc.)

### Frontend Files

- **index.html**: Main HTML file with React mounting point
- **App.js**: Main React component with UI logic
- **index.js**: React entry point
- **package.json**: Frontend dependencies (react, react-dom)
- **.env**: Frontend configuration (API URL, timeouts)

## 🔧 Configuration

### Backend Configuration (.env)

```env
PORT=3001
NODE_ENV=development
SESSION_TIMEOUT=3600000
DEFAULT_SSH_PORT=22
CONNECTION_TIMEOUT=30000
LOG_LEVEL=info
```

### Frontend Configuration (.env)

```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_REFRESH_INTERVAL=5000
REACT_APP_TIMEOUT=10000
```

## 📡 API Endpoints

All endpoints require a valid SSH connection.

### Connection Management

```bash
POST /api/router/connect
{
  "host": "192.168.1.254",
  "port": "22",
  "username": "root",
  "password": "password"
}

POST /api/router/disconnect
{
  "connectionId": "connection_id"
}
```

### Monitoring

```bash
GET /api/router/:connectionId/stats
GET /api/router/:connectionId/devices
```

### Device Management

```bash
POST /api/router/:connectionId/device/:mac/block
{
  "block": true
}
```

### Configuration

```bash
GET /api/router/:connectionId/config
POST /api/router/:connectionId/audit
```

### System Health

```bash
GET /api/health
```

## 🎯 Features

✅ **Connect via SSH**: Secure connection to OpenWRT routers  
✅ **System Monitoring**: Real-time CPU, memory, storage stats  
✅ **Device Management**: View and control connected devices  
✅ **Block/Unblock**: Control device network access  
✅ **Config Retrieval**: Fetch router configurations  
✅ **Security Audit**: Automated security checks  
✅ **Audit Logs**: Track all actions  

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js 16+** and npm (for frontend and Node.js backend)
- **Python 3.8+** (for Python backend only)
- **OpenWRT Router** (virtual or physical)
- **SSH Access** to router

### Step-by-Step

1. **Clone/Download Project**
   ```bash
   git clone <repo>
   cd network-config-auditor
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   # or: pip install -r requirements.txt
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start Backend**
   ```bash
   cd ../backend
   npm start
   # or: python app.py
   ```

5. **Start Frontend** (new terminal)
   ```bash
   cd frontend
   npm start
   ```

6. **Access Application**
   - Open http://localhost:3000

## 🐛 Troubleshooting

### Connection Fails
```bash
# Test SSH connectivity
ssh root@192.168.1.254

# Check if router is reachable
ping 192.168.1.254
```

### Backend Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill existing process if needed
kill -9 <PID>
```

### Frontend CORS Errors
- Ensure backend is running on port 3001
- Check that CORS is enabled in backend (already configured)

### Devices Not Showing
- SSH into router and check:
  ```bash
  cat /tmp/dhcp.leases
  ```

## 📚 Documentation

- See individual files for detailed code documentation
- API endpoints documented in code
- Environment variables documented in .env files

## 🔐 Security Notes

- Never commit .env files with real passwords
- Use SSH keys instead of passwords in production
- Always use HTTPS in production
- Restrict router SSH access to known IPs

## 📝 License

MIT License

## 🤝 Support

For issues:
1. Check logs in frontend browser console
2. Check backend terminal output
3. Verify SSH connection manually
4. Check firewall rules on router

---

**Version**: 1.0.0  
**Created**: November 2025