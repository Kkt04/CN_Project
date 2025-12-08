import React, { useState, useEffect, useCallback } from 'react';

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

  const addAuditLog = useCallback((type, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setAuditLogs(prev => [{
      id: Date.now(),
      type,
      message,
      timestamp
    }, ...prev].slice(0, 50));
  }, []);

  const showError = useCallback((message) => {
    setError(message);
    addAuditLog('error', message);
    setTimeout(() => setError(null), 5000);
  }, [addAuditLog]);

  // ==================== ROUTER CONNECTION ====================

  const connectToRouter = useCallback(async () => {
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

        await fetchStats(data.connectionId);
        await fetchDevices(data.connectionId);
      } else {
        showError(data.error || 'Failed to connect to router');
      }
    } catch (error) {
      showError(`Connection error: ${error.message}`);
    }

    setLoading(false);
  }, [connectionConfig, showError, addAuditLog]);

  const disconnectRouter = useCallback(async () => {
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
  }, [connectionId, addAuditLog]);

  // ==================== DATA FETCHING ====================

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

  const fetchRouterConfig = useCallback(async () => {
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

        alert(configText);
      } else {
        showError(data.error || 'Failed to fetch configuration');
      }
    } catch (error) {
      showError(`Failed to fetch config: ${error.message}`);
    }

    setLoading(false);
  }, [connectionId, addAuditLog, showError]);

  const runSecurityAudit = useCallback(async () => {
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
  }, [connectionId, addAuditLog, showError]);

  // ==================== DEVICE MANAGEMENT ====================

  const blockDevice = useCallback(async (deviceId) => {
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
  }, [connectionId, devices, addAuditLog, showError]);

  // ==================== INPUT HANDLER ====================

  const handleInputChange = (field) => (e) => {
    setConnectionConfig(prev => ({ ...prev, [field]: e.target.value }));
  };

  // ==================== AUTO-REFRESH ====================

  useEffect(() => {
    if (connected && connectionId) {
      const interval = setInterval(() => {
        fetchStats(connectionId);
        fetchDevices(connectionId);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [connected, connectionId]);

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
          <p className="text-gray-600 text-lg">Monitor and manage your virtual router</p>
        </div>

        {/* Connection Panel */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
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
                    onChange={handleInputChange('host')}
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
                    onChange={handleInputChange('port')}
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
                    onChange={handleInputChange('username')}
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
                    onChange={handleInputChange('password')}
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
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
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
            <div>
              {activeTab === 'dashboard' && (
                <div className="bg-white rounded-lg shadow-lg p-8">
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
              )}
              
              {activeTab === 'logs' && (
                <div className="bg-white rounded-lg shadow-lg p-8">
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
              )}
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
