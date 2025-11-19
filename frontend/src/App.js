import React, { useState, useEffect } from 'react';

// API Configuration
const API_BASE = 'http://localhost:3001/api';

const NetworkConfigAuditor = () => {
  // ==================== STATE ====================
  const [connected, setConnected] = useState(false);
  const [routerInfo, setRouterInfo] = useState(null);
  const [devices, setDevices] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [connectionConfig, setConnectionConfig] = useState({
    host: '192.168.1.254',
    port: '22',
    username: 'root',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [error, setError] = useState(null);

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Add log entry to audit logs
   */
  const addAuditLog = (type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setAuditLogs(prev => [{
      id: Date.now(),
      type,
      message,
      timestamp
    }, ...prev].slice(0, 50)); // Keep only last 50 logs
  };

  /**
   * Display error message
   */
  const showError = (message) => {
    setError(message);
    addAuditLog('error', message);
    setTimeout(() => setError(null), 5000);
  };

  // ==================== ROUTER CONNECTION ====================

  /**
   * Connect to OpenWRT router
   */
  const connectToRouter = async () => {
    if (!connectionConfig.host || !connectionConfig.username || !connectionConfig.password) {
      showError('Please fill in all connection fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/router/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionConfig)
      });

      const data = await response.json();

      if (data.success) {
        setConnected(true);
        setConnectionId(data.connectionId);
        setRouterInfo(data.routerInfo);
        addAuditLog('success', `✅ Connected to router at ${connectionConfig.host}`);

        // Fetch initial data
        await fetchStats(data.connectionId);
        await fetchDevices(data.connectionId);
      } else {
        showError(data.error || 'Failed to connect to router');
      }
    } catch (error) {
      showError(`Connection error: ${error.message}`);
    }

    setLoading(false);
  };

  /**
   * Disconnect from router
   */
  const disconnectRouter = async () => {
    if (!connectionId) return;

    setLoading(true);

    try {
      await fetch(`${API_BASE}/router/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId })
      });

      addAuditLog('info', '❌ Disconnected from router');
    } catch (error) {
      console.error('Disconnect error:', error);
    }

    setConnected(false);
    setRouterInfo(null);
    setDevices([]);
    setSystemStats(null);
    setConnectionId(null);
    setLoading(false);
  };

  // ==================== DATA FETCHING ====================

  /**
   * Fetch system statistics
   */
  const fetchStats = async (connId) => {
    try {
      const response = await fetch(`${API_BASE}/router/${connId}/stats`);
      const data = await response.json();

      if (data.success) {
        setSystemStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  /**
   * Fetch connected devices
   */
  const fetchDevices = async (connId) => {
    try {
      const response = await fetch(`${API_BASE}/router/${connId}/devices`);
      const data = await response.json();

      if (data.success) {
        setDevices(data.devices);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  /**
   * Fetch router configuration
   */
  const fetchRouterConfig = async () => {
    if (!connectionId) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/router/${connectionId}/config`);
      const data = await response.json();

      if (data.success) {
        addAuditLog('success', '✅ Configuration fetched successfully');

        const configText = `
========== NETWORK CONFIG ==========
${data.config.network || 'N/A'}

========== DHCP CONFIG ==========
${data.config.dhcp || 'N/A'}

========== FIREWALL CONFIG ==========
${data.config.firewall || 'N/A'}
        `;

        // Display in alert or modal
        alert(configText);
      } else {
        showError(data.error || 'Failed to fetch configuration');
      }
    } catch (error) {
      showError(`Failed to fetch config: ${error.message}`);
    }

    setLoading(false);
  };

  /**
   * Run security audit
   */
  const runSecurityAudit = async () => {
    if (!connectionId) return;

    setLoading(true);

    try {
      addAuditLog('info', '🔍 Starting security audit...');

      const response = await fetch(`${API_BASE}/router/${connectionId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        data.auditResults.forEach(result => {
          const logType = result.status === 'pass' ? 'success' :
            result.status === 'warning' ? 'warning' : 'error';
          addAuditLog(logType, `[${result.category}] ${result.message}`);
        });

        addAuditLog('success', '✅ Security audit completed');
      } else {
        showError(data.error || 'Audit failed');
      }
    } catch (error) {
      showError(`Audit error: ${error.message}`);
    }

    setLoading(false);
  };

  // ==================== DEVICE MANAGEMENT ====================

  /**
   * Block or unblock a device
   */
  const blockDevice = async (deviceId) => {
    if (!connectionId) return;

    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/router/${connectionId}/device/${device.mac}/block`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ block: !device.blocked })
        }
      );

      const data = await response.json();

      if (data.success) {
        setDevices(prev => prev.map(d =>
          d.id === deviceId ? { ...d, blocked: !d.blocked } : d
        ));

        const action = device.blocked ? 'unblocked' : 'blocked';
        addAuditLog('warning', `🚫 Device ${device.name} (${device.ip}) ${action}`);
      } else {
        showError(data.error || 'Failed to block/unblock device');
      }
    } catch (error) {
      showError(`Block error: ${error.message}`);
    }

    setLoading(false);
  };

  // ==================== AUTO-REFRESH ====================

  /**
   * Auto-refresh stats and devices every 5 seconds
   */
  useEffect(() => {
    if (connected && connectionId) {
      const interval = setInterval(() => {
        fetchStats(connectionId);
        fetchDevices(connectionId);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [connected, connectionId]);

  // ==================== COMPONENTS ====================

  /**
   * Connection Panel Component
   */
  const ConnectionPanel = () => (
    <div className="bg-white rounded-lg shadow-lg p-8 mb-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
          </svg>
          <h2 className="text-3xl font-bold text-gray-800">Router Connection</h2>
        </div>
        {connected && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 text-sm font-semibold">Connected</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {!connected ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Host IP Address</label>
              <input
                type="text"
                value={connectionConfig.host}
                onChange={(e) => setConnectionConfig({ ...connectionConfig, host: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="192.168.1.254"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">SSH Port</label>
              <input
                type="text"
                value={connectionConfig.port}
                onChange={(e) => setConnectionConfig({ ...connectionConfig, port: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="22"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={connectionConfig.username}
                onChange={(e) => setConnectionConfig({ ...connectionConfig, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="root"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={connectionConfig.password}
                onChange={(e) => setConnectionConfig({ ...connectionConfig, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          </div>

          <button
            onClick={connectToRouter}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.07 4.93L16.645 7.355C17.726 8.416 18.504 9.842 18.504 11.456 18.504 14.975 15.706 17.772 12.188 17.772 8.67 17.772 5.872 14.975 5.872 11.456 5.872 8.839 7.498 6.601 9.733 6.061L8.71 7.08C8.247 7.545 8.247 8.31 8.71 8.773 9.173 9.236 9.938 9.236 10.401 8.773L13.216 5.959C13.68 5.495 13.68 4.73 13.216 4.267L10.401 1.451C9.938 0.988 9.173 0.988 8.71 1.451 8.247 1.915 8.247 2.68 8.71 3.143L9.733 4.167C7.498 4.706 5.872 6.944 5.872 8.561 5.872 9.995 6.37 11.307 7.196 12.324L4.93 14.59C3.778 13.578 2.902 12.193 2.651 10.603L0.746 12.508C0.283 12.972 0.283 13.736 0.746 14.199 1.21 14.662 1.975 14.662 2.438 14.199L4.344 12.293C5.934 12.903 7.748 13.254 9.641 13.254 11.534 13.254 13.349 12.902 14.938 12.293L16.844 14.199C17.307 14.662 18.072 14.662 18.535 14.199 18.998 13.736 18.998 12.971 18.535 12.508L16.629 10.603C16.378 12.192 15.502 13.578 14.35 14.59L16.616 12.324C17.442 11.307 17.94 9.995 17.94 8.561 17.94 6.944 16.314 4.706 14.079 4.167L15.102 3.143C15.565 2.68 15.565 1.915 15.102 1.451 14.639 0.988 13.874 0.988 13.411 1.451L10.595 4.267C10.132 4.73 10.132 5.495 10.595 5.959L13.41 8.773C13.874 9.236 14.639 9.236 15.102 8.773 15.565 8.31 15.565 7.545 15.102 7.08L14.079 6.061C16.314 6.601 17.94 8.839 17.94 10.456 17.94 12.07 17.162 13.497 16.08 14.557L18.506 12.132C19.432 11.205 20 9.899 20 8.439 20 6.98 19.432 5.674 18.506 4.746 17.926 4.166 17.174 3.78 16.372 3.627L17.828 2.17C18.291 1.707 18.291 0.942 17.828 0.479 17.365 0.016 16.599 0.016 16.137 0.479L14.68 1.936C13.901 1.668 13.05 1.512 12.157 1.512 11.263 1.512 10.412 1.668 9.633 1.936L8.176 0.479C7.713 0.016 6.947 0.016 6.485 0.479 6.021 0.942 6.021 1.707 6.485 2.17L7.941 3.627C7.139 3.78 6.387 4.166 5.808 4.746 4.882 5.674 4.314 6.98 4.314 8.439 4.314 9.899 4.882 11.205 5.808 12.132L3.382 14.558C2.456 13.631 1.888 12.325 1.888 10.866 1.888 9.406 2.456 8.1 3.382 7.173L5.648 4.907C4.566 3.846 3.788 2.42 3.788 0.806 3.788 -2.713 6.586 -5.51 10.104 -5.51 13.622 -5.51 16.42 -2.713 16.42 0.806 16.42 2.42 15.642 3.846 14.56 4.907L16.826 2.641C17.752 3.568 18.32 4.874 18.32 6.333 18.32 7.793 17.752 9.099 16.826 10.026 16.247 10.605 15.495 10.991 14.693 11.144L16.15 12.601C16.613 13.064 16.613 13.829 16.15 14.292 15.687 14.755 14.921 14.755 14.459 14.292L13.002 12.835C12.223 13.103 11.372 13.259 10.479 13.259 9.585 13.259 8.734 13.103 7.955 12.835L6.498 14.292C6.035 14.755 5.269 14.755 4.807 14.292 4.343 13.829 4.343 13.064 4.807 12.601L6.264 11.144C5.462 10.991 4.71 10.605 4.131 10.026 3.205 9.099 2.637 7.793 2.637 6.333 2.637 4.874 3.205 3.568 4.131 2.641L1.865 4.907C0.939 3.98 0.371 2.674 0.371 1.215 0.371 -0.244 1.149 -1.67 2.231 -2.731L0 -5 0 0 0 6 0 12 6 12 12 12 12 6 12 0 0 0 0 6 0 0 -5 0 -2.731 2.231 -1.67 1.149 -0.244 0.371 1.215 0.371 2.674 0.939 3.98 1.865 4.907 4.131 2.641 3.205 3.568 2.637 4.874 2.637 6.333 2.637 7.793 3.205 9.099 4.131 10.026 4.71 10.605 5.462 10.991 6.264 11.144L4.807 12.601C4.343 13.064 4.343 13.829 4.807 14.292 5.269 14.755 6.035 14.755 6.498 14.292L7.955 12.835C8.734 13.103 9.585 13.259 10.479 13.259 11.372 13.259 12.223 13.103 13.002 12.835L14.459 14.292C14.921 14.755 15.687 14.755 16.15 14.292 16.613 13.829 16.613 13.064 16.15 12.601L14.693 11.144C15.495 10.991 16.247 10.605 16.826 10.026 17.752 9.099 18.32 7.793 18.32 6.333 18.32 4.874 17.752 3.568 16.826 2.641L19.07 4.93Z" />
                </svg>
                Connect to Router
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Model</p>
              <p className="font-semibold text-gray-800 text-sm">{routerInfo?.model}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Version</p>
              <p className="font-semibold text-gray-800 text-sm">{routerInfo?.version}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Hostname</p>
              <p className="font-semibold text-gray-800 text-sm">{routerInfo?.hostname}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold uppercase">Uptime</p>
              <p className="font-semibold text-gray-800 text-xs">{routerInfo?.uptime?.split(',')[0]}</p>
            </div>
          </div>

          {systemStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-xs text-gray-600 font-semibold uppercase mb-2">CPU Usage</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-blue-600">{Math.round(systemStats.cpu)}</p>
                  <p className="text-gray-600 mb-1">%</p>
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Memory</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-purple-600">{Math.round(systemStats.memory)}</p>
                  <p className="text-gray-600 mb-1">%</p>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Storage</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-bold text-green-600">{Math.round(systemStats.storage)}</p>
                  <p className="text-gray-600 mb-1">%</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={fetchRouterConfig}
              disabled={loading}
              className="flex-1 min-w-[140px] bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              📋 Fetch Config
            </button>
            <button
              onClick={runSecurityAudit}
              disabled={loading}
              className="flex-1 min-w-[140px] bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              🔍 Security Audit
            </button>
            <button
              onClick={disconnectRouter}
              className="flex-1 min-w-[140px] bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-all duration-200"
            >
              🔌 Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Devices Panel Component
   */
  const DevicesPanel = () => (
    <div className="bg-white rounded-lg shadow-lg p-8 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-800">Connected Devices</h2>
        <span className="ml-auto bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
          {devices.length} device{devices.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {devices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No devices connected yet</p>
            <p className="text-sm text-gray-400">Connected devices will appear here</p>
          </div>
        ) : (
          devices.map(device => (
            <div
              key={device.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${device.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div>
                  <p className="font-semibold text-gray-800">{device.name}</p>
                  <p className="text-sm text-gray-600">{device.ip} • {device.mac}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {device.blocked && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                    🚫 Blocked
                  </span>
                )}
                <button
                  onClick={() => blockDevice(device.id)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed ${
                    device.blocked
                      ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                      : 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
                  }`}
                >
                  {device.blocked ? '✅ Unblock' : '❌ Block'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  /**
   * Audit Logs Panel Component
   */
  const AuditLogsPanel = () => (
    <div className="bg-white rounded-lg shadow-lg p-8 fade-in">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-1">
        {auditLogs.length === 0 ? (
          <p className="text-gray-500 text-center py-40">No logs yet. Connect to start monitoring.</p>
        ) : (
          auditLogs.map(log => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <span className="text-gray-500 min-w-fit">[{log.timestamp}]</span>
              <span className={`${
                log.type === 'success' ? 'text-green-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                log.type === 'error' ? 'text-red-400' :
                'text-blue-400'
              }`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.5 6c-1.93 0-3.5 1.57-3.5 3.5 0 .54.13 1.05.36 1.5H7.14c.23-.45.36-.96.36-1.5C7.5 7.57 5.93 6 4 6 2.07 6 .5 7.57.5 9.5S2.07 13 4 13c1.5 0 2.79-.84 3.46-2.07h9.08c.67 1.23 1.96 2.07 3.46 2.07 1.93 0 3.5-1.57 3.5-3.5S22.43 6 20.5 6zm0 5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM4 11c-.83 0-1.5-.67-1.5-1.5S3.17 8 4 8s1.5.67 1.5 1.5S4.83 11 4 11z" />
            </svg>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Network Configuration Auditor</h1>
          </div>
          <p className="text-gray-600 text-lg">Monitor and manage your OpenWRT virtual router</p>
        </div>

        {/* Connection Panel */}
        <ConnectionPanel />

        {/* Tabs and Content */}
        {connected && (
          <>
            <div className="mb-6 flex gap-4 border-b-2 border-gray-300">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-3 font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'text-blue-600 border-b-4 border-blue-600 -mb-[2px]'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                Devices ({devices.length})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-3 font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'logs'
                    ? 'text-blue-600 border-b-4 border-blue-600 -mb-[2px]'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                Audit Logs ({auditLogs.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="fade-in">
              {activeTab === 'dashboard' && <DevicesPanel />}
              {activeTab === 'logs' && <AuditLogsPanel />}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Network Configuration Auditor v1.0.0 • OpenWRT Router Management</p>
        </div>
      </div>
    </div>
  );
};

export default NetworkConfigAuditor;