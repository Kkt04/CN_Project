import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Wifi, Shield, Clock, Server, Cpu, HardDrive, Thermometer, Upload, Download, Signal } from 'lucide-react';

// Mock API for demo
const API_BASE = 'http://localhost:3001/api';

const NetworkConfigAuditor = () => {
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
  const [systemStats, setSystemStats] = useState({
    cpu: 45,
    memory: 62,
    storage: 38,
    temperature: 52,
    bandwidth: { upload: 2.4, download: 8.7 },
    latency: 12,
    packets: { sent: 15420, received: 18650 }
  });
  const [connectionId, setConnectionId] = useState(null);
  const [error, setError] = useState(null);
  const [securityScore, setSecurityScore] = useState(85);

  // Demo data
  useEffect(() => {
    if (connected) {
      setDevices([
        { id: 1, name: 'iPhone 13', ip: '192.168.1.101', mac: '00:1A:2B:3C:4D:5E', type: 'phone', status: 'active', blocked: false, network: 'HomeWiFi-5G', router: 'OpenWRT', gateway: '192.168.1.1', connectedTime: '2h 34m', bandwidth: '1.2 MB/s', signal: 95 },
        { id: 2, name: 'MacBook Pro', ip: '192.168.1.102', mac: '00:1A:2B:3C:4D:5F', type: 'laptop', status: 'active', blocked: false, network: 'HomeWiFi-5G', router: 'OpenWRT', gateway: '192.168.1.1', connectedTime: '5h 12m', bandwidth: '3.5 MB/s', signal: 88 },
        { id: 3, name: 'Smart TV', ip: '192.168.1.103', mac: '00:1A:2B:3C:4D:60', type: 'tv', status: 'active', blocked: false, network: 'HomeWiFi-2.4G', router: 'OpenWRT', gateway: '192.168.1.1', connectedTime: '12h 45m', bandwidth: '0.8 MB/s', signal: 72 },
        { id: 4, name: 'iPad Air', ip: '192.168.1.104', mac: '00:1A:2B:3C:4D:61', type: 'tablet', status: 'active', blocked: true, network: 'HomeWiFi-5G', router: 'OpenWRT', gateway: '192.168.1.1', connectedTime: '0m', bandwidth: '0 MB/s', signal: 0 }
      ]);

      setAuditLogs([
        { id: 1, type: 'success', message: '✅ Connected to router at 192.168.1.254', timestamp: '14:32:15' },
        { id: 2, type: 'info', message: '🔍 Starting security audit...', timestamp: '14:32:20' },
        { id: 3, type: 'success', message: '[SSH Security] SSH is configured', timestamp: '14:32:22' },
        { id: 4, type: 'success', message: '[Firewall] Firewall status checked', timestamp: '14:32:23' },
        { id: 5, type: 'warning', message: '🚫 Device iPad Air (192.168.1.104) blocked', timestamp: '14:35:10' }
      ]);
    }
  }, [connected]);

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

  const connectToRouter = useCallback(async () => {
    if (!connectionConfig.password) {
      showError('Please enter password');
      return;
    }

    setLoading(true);
    setError(null);

    // Demo connection
    setTimeout(() => {
      setConnected(true);
      setConnectionId('demo-123');
      setRouterInfo({
        hostname: 'OpenWRT-Router',
        version: '23.05.2',
        model: 'Virtual Router',
        uptime: '15 days, 7:23:45'
      });
      addAuditLog('success', `✅ Connected to router at ${connectionConfig.host}`);
      setLoading(false);
    }, 1500);
  }, [connectionConfig, showError, addAuditLog]);

  const disconnectRouter = useCallback(() => {
    setConnected(false);
    setRouterInfo(null);
    setDevices([]);
    setConnectionId(null);
    addAuditLog('info', '❌ Disconnected from router');
  }, [addAuditLog]);

  const blockDevice = useCallback((deviceId) => {
    setDevices(prev => prev.map(d =>
      d.id === deviceId ? { ...d, blocked: !d.blocked, connectedTime: d.blocked ? '0m' : d.connectedTime, bandwidth: d.blocked ? '0 MB/s' : d.bandwidth, signal: d.blocked ? 0 : d.signal } : d
    ));
    const device = devices.find(d => d.id === deviceId);
    const action = device.blocked ? 'unblocked' : 'blocked';
    addAuditLog('warning', `🚫 Device ${device.name} (${device.ip}) ${action}`);
  }, [devices, addAuditLog]);

  const getDeviceIcon = (type) => {
    switch(type) {
      case 'phone': return '📱';
      case 'laptop': return '💻';
      case 'tv': return '📺';
      case 'tablet': return '📱';
      default: return '🖥️';
    }
  };

  const getSignalColor = (signal) => {
    if (signal >= 80) return 'text-green-500';
    if (signal >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSignalBars = (signal) => {
    const bars = Math.ceil((signal / 100) * 4);
    return '█'.repeat(bars) + '░'.repeat(4 - bars);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-blue-500/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Wifi className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Network Configuration Auditor</h1>
                <p className="text-xs text-blue-300">Real-time Router Management Dashboard</p>
              </div>
            </div>
            {connected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-sm font-semibold">Connected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Connection Panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-blue-500/30 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Router Connection</h2>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {!connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-300 mb-2">Host IP</label>
                  <input
                    type="text"
                    value={connectionConfig.host}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, host: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-blue-500/30 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="192.168.1.254"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-300 mb-2">SSH Port</label>
                  <input
                    type="text"
                    value={connectionConfig.port}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, port: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-blue-500/30 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="22"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={connectionConfig.username}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-blue-500/30 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="root"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={connectionConfig.password}
                    onChange={(e) => setConnectionConfig(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-blue-500/30 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                onClick={connectToRouter}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="w-5 h-5" />
                    Connect to Router
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Router Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                <div>
                  <p className="text-xs text-blue-300 font-semibold uppercase mb-1">Model</p>
                  <p className="font-semibold text-white text-sm">{routerInfo?.model}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-300 font-semibold uppercase mb-1">Version</p>
                  <p className="font-semibold text-white text-sm">{routerInfo?.version}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-300 font-semibold uppercase mb-1">Hostname</p>
                  <p className="font-semibold text-white text-sm">{routerInfo?.hostname}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-300 font-semibold uppercase mb-1">Uptime</p>
                  <p className="font-semibold text-white text-xs">{routerInfo?.uptime?.split(',')[0]}</p>
                </div>
              </div>

              {/* System Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <p className="text-xs text-blue-300 font-semibold uppercase">CPU</p>
                  </div>
                  <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold text-white">{systemStats.cpu}</p>
                    <p className="text-blue-300 mb-0.5 text-sm">%</p>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${systemStats.cpu}%` }}></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <p className="text-xs text-purple-300 font-semibold uppercase">Memory</p>
                  </div>
                  <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold text-white">{systemStats.memory}</p>
                    <p className="text-purple-300 mb-0.5 text-sm">%</p>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-300" style={{ width: `${systemStats.memory}%` }}></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-green-300 font-semibold uppercase">Storage</p>
                  </div>
                  <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold text-white">{systemStats.storage}</p>
                    <p className="text-green-300 mb-0.5 text-sm">%</p>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-300" style={{ width: `${systemStats.storage}%` }}></div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer className="w-4 h-4 text-orange-400" />
                    <p className="text-xs text-orange-300 font-semibold uppercase">Temp</p>
                  </div>
                  <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold text-white">{systemStats.temperature}</p>
                    <p className="text-orange-300 mb-0.5 text-sm">°C</p>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-300" style={{ width: `${(systemStats.temperature / 100) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Network Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-400" />
                      <p className="text-xs text-blue-300 font-semibold">Upload</p>
                    </div>
                    <p className="text-lg font-bold text-white">{systemStats.bandwidth.upload} MB/s</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-green-400" />
                      <p className="text-xs text-green-300 font-semibold">Download</p>
                    </div>
                    <p className="text-lg font-bold text-white">{systemStats.bandwidth.download} MB/s</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-300 font-semibold mb-1">Latency</p>
                      <p className="text-2xl font-bold text-white">{systemStats.latency} <span className="text-sm text-blue-300">ms</span></p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-400" />
                  </div>
                </div>

                <div className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                  <p className="text-xs text-blue-300 font-semibold mb-2">Packets</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Sent:</span>
                      <span className="text-white font-semibold">{systemStats.packets.sent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Received:</span>
                      <span className="text-white font-semibold">{systemStats.packets.received.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Score */}
              <div className="p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-sm text-green-300 font-semibold">Security Score</p>
                      <p className="text-xs text-gray-400">Overall system security rating</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">{securityScore}</p>
                    <p className="text-xs text-green-300">/ 100</p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${securityScore}%` }}></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <button className="flex-1 min-w-[140px] bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200">
                  📋 Fetch Config
                </button>
                <button className="flex-1 min-w-[140px] bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200">
                  🔍 Security Audit
                </button>
                <button
                  onClick={disconnectRouter}
                  className="flex-1 min-w-[140px] bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200"
                >
                  🔌 Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        {connected && (
          <>
            <div className="flex gap-4 border-b-2 border-blue-500/30">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-3 font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'dashboard'
                    ? 'text-blue-400 border-b-4 border-blue-400 -mb-[2px]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Activity className="w-5 h-5" />
                Devices ({devices.length})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-3 font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'logs'
                    ? 'text-blue-400 border-b-4 border-blue-400 -mb-[2px]'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Clock className="w-5 h-5" />
                Audit Logs ({auditLogs.length})
              </button>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'dashboard' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-blue-500/30 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Wifi className="w-6 h-6 text-blue-400" />
                    <h2 className="text-xl font-bold text-white">Connected Devices</h2>
                    <span className="ml-auto bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-semibold border border-blue-500/30">
                      {devices.length} device{devices.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {devices.map(device => (
                      <div
                        key={device.id}
                        className="p-4 bg-slate-700/30 border border-blue-500/20 rounded-lg hover:bg-slate-700/50 hover:border-blue-500/40 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="text-3xl">{getDeviceIcon(device.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-semibold text-white text-lg">{device.name}</p>
                                {device.blocked && (
                                  <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full font-semibold border border-red-500/30">
                                    🚫 Blocked
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">IP:</span>
                                  <span className="text-blue-300 font-mono">{device.ip}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">MAC:</span>
                                  <span className="text-blue-300 font-mono text-xs">{device.mac}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Network:</span>
                                  <span className="text-white font-semibold">{device.network}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Router:</span>
                                  <span className="text-white">{device.router}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Gateway:</span>
                                  <span className="text-blue-300 font-mono">{device.gateway}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Connected:</span>
                                  <span className="text-green-300">{device.connectedTime}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Bandwidth:</span>
                                  <span className="text-purple-300 font-semibold">{device.bandwidth}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Signal className="w-4 h-4 text-gray-400" />
                                  <span className={`font-mono font-bold ${getSignalColor(device.signal)}`}>
                                    {getSignalBars(device.signal)} {device.signal}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => blockDevice(device.id)}
                            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap ${
                              device.blocked
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                                : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                            }`}
                          >
                            {device.blocked ? '✅ Unblock' : '❌ Block'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-blue-500/30 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-6 h-6 text-blue-400" />
                    <h2 className="text-xl font-bold text-white">Live Audit Logs</h2>
                  </div>

                  <div className="bg-slate-950/80 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-2 border border-blue-500/20">
                    {auditLogs.length === 0 ? (
                      <p className="text-gray-500 text-center py-40">No logs yet. Connect to start monitoring.</p>
                    ) : (
                      auditLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-2 hover:bg-slate-800/50 rounded transition-colors">
                          <span className="text-gray-500 min-w-fit text-xs">[{log.timestamp}]</span>
                          <span className={`text-xs leading-relaxed ${
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

        {/* Example Features Section */}
        {!connected && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-blue-500/30 shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">What You'll Get</h2>
              <p className="text-gray-400">Comprehensive router management and monitoring features</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Real-time Monitoring</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>CPU, Memory, Storage, Temperature with animated graphs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Bandwidth tracking (Upload/Download)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>Network latency and packet statistics</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Wifi className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Device Management</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>Device type icons (📱💻📺) and detailed info</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>Network details, bandwidth usage per device</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>Signal strength with color indicators</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>One-click block/unblock functionality</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Shield className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Security Audit</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>Comprehensive security scoring system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>SSH, Firewall, and DHCP security checks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">•</span>
                    <span>Real-time vulnerability detection</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Live Audit Logs</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Color-coded log messages for easy reading</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Real-time event tracking and timestamps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>Complete audit trail of all activities</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-gradient-to-r from-slate-800/50 to-blue-900/50 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6 text-center">
            <p className="text-gray-300 text-sm mb-2">Presents you</p>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-1">
              Network Configuration Auditor
            </h3>
            <p className="text-gray-400 text-sm">
              Created by <span className="text-blue-400 font-semibold">Kalash</span> and <span className="text-purple-400 font-semibold">Manasa</span>
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span>v1.0.0</span>
              <span>•</span>
              <span>OpenWRT Router Management</span>
              <span>•</span>
              <span>© 2024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkConfigAuditor;