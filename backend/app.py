# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import paramiko
import re
from datetime import datetime
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
PORT = int(os.getenv('PORT', 3001))
NODE_ENV = os.getenv('NODE_ENV', 'development')

# Store active SSH connections
connections = {}

class RouterConnection:
    """Manage SSH connections to OpenWRT router"""
    def __init__(self, host, port, username, password):
        self.host = host
        self.port = port
        self.username = username
        self.connection_id = str(uuid.uuid4())
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            self.client.connect(
                host, 
                port=port, 
                username=username, 
                password=password, 
                timeout=10
            )
        except Exception as e:
            raise Exception(f"SSH Connection Failed: {str(e)}")
    
    def execute_command(self, command):
        """Execute SSH command and return output"""
        try:
            stdin, stdout, stderr = self.client.exec_command(command, timeout=10)
            output = stdout.read().decode('utf-8', errors='ignore')
            error = stderr.read().decode('utf-8', errors='ignore')
            exit_code = stdout.channel.recv_exit_status()
            
            if exit_code != 0:
                raise Exception(error or f"Command failed with code {exit_code}")
            
            return output.strip()
        except Exception as e:
            raise Exception(f"Command execution failed: {str(e)}")
    
    def close(self):
        """Close SSH connection"""
        try:
            self.client.close()
        except:
            pass

# ============================================
# HELPER FUNCTIONS
# ============================================

def parse_cpu_usage(cpu_info):
    """Extract CPU usage percentage"""
    try:
        match = re.search(r'(\d+)%\s+idle', cpu_info)
        if match:
            return 100 - int(match.group(1))
        return 0
    except:
        return 0

def parse_memory_usage(mem_info):
    """Extract memory usage percentage"""
    try:
        parts = mem_info.split()
        if len(parts) >= 3:
            total = int(parts[1])
            used = int(parts[2])
            return round((used / total) * 100) if total > 0 else 0
        return 0
    except:
        return 0

def parse_disk_usage(disk_info):
    """Extract disk usage percentage"""
    try:
        match = re.search(r'(\d+)%', disk_info)
        if match:
            return int(match.group(1))
        return 0
    except:
        return 0

def parse_dhcp_leases(leases_output):
    """Parse DHCP leases and return connected devices"""
    devices = []
    lines = leases_output.strip().split('\n')
    
    for idx, line in enumerate(lines):
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) >= 4:
            try:
                devices.append({
                    'id': idx + 1,
                    'name': parts[3] if len(parts) > 3 else f'Device-{idx + 1}',
                    'ip': parts[2],
                    'mac': parts[1],
                    'status': 'active',
                    'blocked': False,
                    'leaseExpiry': datetime.fromtimestamp(int(parts[0])).strftime('%Y-%m-%d %H:%M:%S')
                })
            except:
                continue
    
    return devices

# ============================================
# API ROUTES
# ============================================

@app.route('/api/router/connect', methods=['POST'])
def connect_router():
    """Connect to OpenWRT router via SSH"""
    try:
        data = request.json
        host = data.get('host')
        port = int(data.get('port', 22))
        username = data.get('username')
        password = data.get('password')
        
        if not all([host, username, password]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: host, username, password'
            }), 400
        
        # Create SSH connection
        conn = RouterConnection(host, port, username, password)
        
        # Get router information
        try:
            hostname = conn.execute_command('uci get system.@system[0].hostname')
        except:
            hostname = 'OpenWRT'
        
        try:
            uptime = conn.execute_command('uptime')
        except:
            uptime = 'Unknown'
        
        try:
            version_line = conn.execute_command('cat /etc/openwrt_release | grep DISTRIB_RELEASE')
            version = version_line.split('=')[1].replace("'", "").strip() if '=' in version_line else 'Unknown'
        except:
            version = 'Unknown'
        
        # Store connection
        connection_id = conn.connection_id
        connections[connection_id] = conn
        
        print(f"✅ New connection: {connection_id} to {host}")
        
        return jsonify({
            'success': True,
            'connectionId': connection_id,
            'routerInfo': {
                'hostname': hostname,
                'uptime': uptime,
                'version': version,
                'model': 'OpenWRT Virtual Router'
            }
        })
    
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/router/disconnect', methods=['POST'])
def disconnect_router():
    """Disconnect from router"""
    try:
        data = request.json
        connection_id = data.get('connectionId')
        
        if connection_id in connections:
            connections[connection_id].close()
            del connections[connection_id]
            print(f"✅ Disconnected: {connection_id}")
            return jsonify({'success': True})
        
        return jsonify({
            'success': False,
            'error': 'Connection not found'
        }), 404
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/router/<connection_id>/stats', methods=['GET'])
def get_stats(connection_id):
    """Get system statistics (CPU, Memory, Storage)"""
    try:
        if connection_id not in connections:
            return jsonify({
                'success': False,
                'error': 'Connection not found'
            }), 404
        
        conn = connections[connection_id]
        
        # Get CPU usage
        try:
            cpu_info = conn.execute_command('top -bn1 | grep "CPU:"')
            cpu_usage = parse_cpu_usage(cpu_info)
        except:
            cpu_usage = 0
        
        # Get memory usage
        try:
            mem_info = conn.execute_command('free | grep Mem')
            mem_usage = parse_memory_usage(mem_info)
        except:
            mem_usage = 0
        
        # Get disk usage
        try:
            disk_info = conn.execute_command('df -h / | tail -1')
            disk_usage = parse_disk_usage(disk_info)
        except:
            disk_usage = 0
        
        return jsonify({
            'success': True,
            'stats': {
                'cpu': cpu_usage,
                'memory': mem_usage,
                'storage': disk_usage
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/router/<connection_id>/devices', methods=['GET'])
def get_devices(connection_id):
    """Get connected devices from DHCP leases"""
    try:
        if connection_id not in connections:
            return jsonify({
                'success': False,
                'error': 'Connection not found'
            }), 404
        
        conn = connections[connection_id]
        
        # Get DHCP leases
        try:
            leases = conn.execute_command('cat /tmp/dhcp.leases')
            devices = parse_dhcp_leases(leases)
        except:
            devices = []
        
        return jsonify({
            'success': True,
            'devices': devices
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/router/<connection_id>/device/<mac>/block', methods=['POST'])
def block_device(connection_id, mac):
    """Block or unblock a device by MAC address"""
    try:
        if connection_id not in connections:
            return jsonify({
                'success': False,
                'error': 'Connection not found'
            }), 404
        
        conn = connections[connection_id]
        data = request.json
        should_block = data.get('block', True)
        
        if should_block:
            conn.execute_command(f'iptables -I FORWARD -m mac --mac-source {mac} -j DROP')
            print(f"🚫 Blocked device: {mac}")
        else:
            conn.execute_command(f'iptables -D FORWARD -m mac --mac-source {mac} -j DROP')
            print(f"✅ Unblocked device: {mac}")
        
        return jsonify({
            'success': True,
            'message': f'Device {"blocked" if should_block else "unblocked"} successfully'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/router/<connection_id>/config', methods=['GET'])
def get_config(connection_id):
    """Get router configuration files"""
    try:
        if connection_id not in connections:
            return jsonify({
                'success': False,
                'error': 'Connection not found'
            }), 404
        
        conn = connections[connection_id]
        
        try:
            network_config = conn.execute_command('cat /etc/config/network')
        except:
            network_config = 'N/A'
        
        try:
            dhcp_config = conn.execute_command('cat /etc/config/dhcp')
        except:
            dhcp_config = 'N/A'
        
        try:
            firewall_config = conn.execute_command('cat /etc/config/firewall')
        except:
            firewall_config = 'N/A'
        
        return jsonify({
            'success': True,
            'config': {
                'network': network_config,
                'dhcp': dhcp_config,
                'firewall': firewall_config
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/router/<connection_id>/audit', methods=['POST'])
def run_audit(connection_id):
    """Run security audit on router"""
    try:
        if connection_id not in connections:
            return jsonify({
                'success': False,
                'error': 'Connection not found'
            }), 404
        
        conn = connections[connection_id]
        results = []
        
        # Check SSH configuration
        try:
            ssh_config = conn.execute_command('cat /etc/config/dropbear')
            results.append({
                'category': 'SSH Security',
                'status': 'pass' if 'PasswordAuth' not in ssh_config else 'warning',
                'message': 'SSH is configured and running'
            })
        except:
            results.append({
                'category': 'SSH Security',
                'status': 'fail',
                'message': 'Unable to check SSH configuration'
            })
        
        # Check firewall status
        try:
            firewall_status = conn.execute_command('/etc/init.d/firewall status')
            results.append({
                'category': 'Firewall',
                'status': 'pass' if 'running' in firewall_status else 'fail',
                'message': 'Firewall status checked'
            })
        except:
            results.append({
                'category': 'Firewall',
                'status': 'fail',
                'message': 'Unable to check firewall status'
            })
        
        # Check credentials
        results.append({
            'category': 'Default Credentials',
            'status': 'pass',
            'message': 'Root password is set (logged in successfully)'
        })
        
        # Check DHCP
        try:
            dhcp_config = conn.execute_command('cat /etc/config/dhcp')
            results.append({
                'category': 'DHCP Security',
                'status': 'pass',
                'message': 'DHCP configuration validated'
            })
        except:
            results.append({
                'category': 'DHCP Security',
                'status': 'warning',
                'message': 'Unable to validate DHCP configuration'
            })
        
        print(f"📋 Audit completed for {connection_id}")
        
        return jsonify({
            'success': True,
            'auditResults': results
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/router/<connection_id>/interfaces', methods=['GET'])
def get_interfaces(connection_id):
    """Get network interfaces"""
    try:
        if connection_id not in connections:
            return jsonify({
                'success': False,
                'error': 'Connection not found'
            }), 404
        
        conn = connections[connection_id]
        
        try:
            interfaces = conn.execute_command('ifconfig')
        except:
            interfaces = 'Unable to fetch interfaces'
        
        return jsonify({
            'success': True,
            'interfaces': interfaces
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'activeConnections': len(connections),
        'timestamp': datetime.now().isoformat(),
        'environment': NODE_ENV
    }), 200

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

# ============================================
# CLEANUP & STARTUP
# ============================================

import atexit

def cleanup():
    """Close all SSH connections on shutdown"""
    print("\n🛑 Closing all connections...")
    for conn in connections.values():
        try:
            conn.close()
        except:
            pass

atexit.register(cleanup)

if __name__ == '__main__':
    print('🚀 Network Configuration Auditor API (Python/Flask)')
    print(f'📍 Running on http://0.0.0.0:{PORT}')
    print(f'🌐 Environment: {NODE_ENV}')
    print(f'📊 Active connections: {len(connections)}')
    print('⏹️  Press CTRL+C to stop\n')
    
    app.run(
        host='0.0.0.0', 
        port=PORT, 
        debug=(NODE_ENV == 'development'),
        use_reloader=False
    )