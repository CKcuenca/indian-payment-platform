import api from './api';

export interface SystemOverview {
  totalMerchants: number;
  activeMerchants: number;
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  averageResponseTime: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
  lastUpdate: string;
}

export interface SystemMetrics {
  timestamp: string;
  system: {
    cpu: number;
    memory: number;
    disk: number;
    load: number;
  };
  application: {
    responseTime: number;
    errorRate: number;
    activeConnections: number;
    throughput: number;
  };
  business: {
    dailyTransactions: number;
    dailyVolume: number;
    successRate: number;
    averageAmount: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
    cacheHitRate: number;
  };
  network: {
    inTraffic: number;
    outTraffic: number;
    latency: number;
    packetLoss: number;
  };
}

export interface SystemAlert {
  id: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  message: string;
  details: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
  uptime: string;
  responseTime: number;
  lastCheck: string;
  details: Record<string, any>;
}

class MonitoringService {
  /**
   * 获取系统概览
   */
  async getSystemOverview(): Promise<SystemOverview> {
    try {
      const response = await api.get('/monitoring/overview');
      return response.data.data;
    } catch (error) {
      console.error('获取系统概览失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统指标
   */
  async getSystemMetrics(hours: number = 24, type?: string): Promise<SystemMetrics[]> {
    try {
      const params = new URLSearchParams();
      params.append('hours', hours.toString());
      if (type) params.append('type', type);

      const response = await api.get(`/monitoring/metrics?${params.toString()}`);
      return response.data.data.metrics;
    } catch (error) {
      console.error('获取系统指标失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统告警
   */
  async getSystemAlerts(severity?: string, limit: number = 50): Promise<SystemAlert[]> {
    try {
      const params = new URLSearchParams();
      if (severity) params.append('severity', severity);
      params.append('limit', limit.toString());

      const response = await api.get(`/monitoring/alerts?${params.toString()}`);
      return response.data.data.alerts;
    } catch (error) {
      console.error('获取系统告警失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<ServiceStatus[]> {
    try {
      const response = await api.get('/monitoring/services');
      return response.data.data.services;
    } catch (error) {
      console.error('获取服务状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能趋势
   */
  async getPerformanceTrends(hours: number = 24): Promise<SystemMetrics[]> {
    try {
      const response = await api.get(`/monitoring/metrics?hours=${hours}&type=trends`);
      return response.data.data.metrics;
    } catch (error) {
      console.error('获取性能趋势失败:', error);
      throw error;
    }
  }

  /**
   * 获取实时指标
   */
  async getRealTimeMetrics(): Promise<SystemMetrics> {
    try {
      const response = await api.get('/monitoring/metrics/realtime');
      return response.data.data;
    } catch (error) {
      console.error('获取实时指标失败:', error);
      throw error;
    }
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await api.post(`/monitoring/alerts/${alertId}/acknowledge`);
    } catch (error) {
      console.error('确认告警失败:', error);
      throw error;
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    try {
      await api.post(`/monitoring/alerts/${alertId}/resolve`, { resolution });
    } catch (error) {
      console.error('解决告警失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统健康检查
   */
  async getHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      responseTime: number;
      details: string;
    }>;
  }> {
    try {
      const response = await api.get('/monitoring/health');
      return response.data.data;
    } catch (error) {
      console.error('获取健康检查失败:', error);
      throw error;
    }
  }
}

export const monitoringService = new MonitoringService();
