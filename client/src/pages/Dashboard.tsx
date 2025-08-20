import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { Merchant, Transaction } from '../types';
import { merchantService } from '../services/merchantService';
import { formatAmount } from '../utils/formatters';

interface StatCardProps {
  title: string;
  value: string;
  color?: string;
  changePercent?: number;
  changeLabel?: string;
}

function StatCard({ title, value, color = 'primary.main', changePercent, changeLabel }: StatCardProps) {
  const isPositive = changePercent && changePercent > 0;
  const isNegative = changePercent && changePercent < 0;
  
  return (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ color }}>
          {value}
        </Typography>
        {changeLabel && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant="caption" color="textSecondary">
              {changeLabel}
            </Typography>
            {changePercent !== undefined && (
              <Chip
                icon={isPositive ? <TrendingUpIcon /> : isNegative ? <TrendingDownIcon /> : undefined}
                label={`${isPositive ? '+' : ''}${changePercent.toFixed(1)}%`}
                size="small"
                color={isPositive ? 'success' : isNegative ? 'error' : 'default'}
                variant="outlined"
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [merchantRes, transactionsRes] = await Promise.all([
          merchantService.getMerchantInfo(),
          merchantService.getTransactions({ limit: 50 }), // 增加限制以获取更多数据用于筛选
        ]);

        setMerchant(merchantRes.data);
        setTransactions(transactionsRes.data?.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || '获取数据失败');
        // 确保在错误时设置空数组
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!merchant) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">无法获取商户信息</Alert>
      </Box>
    );
  }

  // 获取印度时间
  const getIndianTime = () => {
    const now = new Date();
    // 印度标准时间 (IST) = UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5小时转换为毫秒
    return new Date(now.getTime() + istOffset);
  };

  // 日期计算函数
  const getDateRange = (type: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth') => {
    const now = getIndianTime();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (type) {
      case 'today':
        return { start: today, end: now };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayNow = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: yesterdayNow };
      case 'thisWeek':
        const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
        return { start: thisWeekStart, end: now };
      case 'lastWeek':
        const lastWeekStart = new Date(today.getTime() - (today.getDay() + 7) * 24 * 60 * 60 * 1000);
        const lastWeekNow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: lastWeekStart, end: lastWeekNow };
      case 'thisMonth':
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: thisMonthStart, end: now };
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthNow = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: lastMonthStart, end: lastMonthNow };
    }
  };
  
  // 计算指定日期范围内的交易总额
  const calculateTransactionTotal = (transactions: Transaction[], dateRange: { start: Date; end: Date }, type: 'DEPOSIT' | 'WITHDRAWAL') => {
    return transactions
      .filter(transaction => {
        const transactionDate = new Date(transaction.createdAt);
        return transactionDate >= dateRange.start && 
               transactionDate < dateRange.end && 
               transaction.type === type &&
               transaction.status === 'SUCCESS';
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };
  
  // 计算涨幅百分比
  const calculateChangePercent = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  // 今日数据
  const todayRange = getDateRange('today');
  const yesterdayRange = getDateRange('yesterday');
  const todayDeposits = calculateTransactionTotal(transactions, todayRange, 'DEPOSIT');
  const todayWithdrawals = calculateTransactionTotal(transactions, todayRange, 'WITHDRAWAL');
  const yesterdayDeposits = calculateTransactionTotal(transactions, yesterdayRange, 'DEPOSIT');
  const yesterdayWithdrawals = calculateTransactionTotal(transactions, yesterdayRange, 'WITHDRAWAL');
  
  // 本周数据
  const thisWeekRange = getDateRange('thisWeek');
  const lastWeekRange = getDateRange('lastWeek');
  const thisWeekDeposits = calculateTransactionTotal(transactions, thisWeekRange, 'DEPOSIT');
  const thisWeekWithdrawals = calculateTransactionTotal(transactions, thisWeekRange, 'WITHDRAWAL');
  const lastWeekDeposits = calculateTransactionTotal(transactions, lastWeekRange, 'DEPOSIT');
  const lastWeekWithdrawals = calculateTransactionTotal(transactions, lastWeekRange, 'WITHDRAWAL');
  
  // 本月数据
  const thisMonthRange = getDateRange('thisMonth');
  const lastMonthRange = getDateRange('lastMonth');
  const thisMonthDeposits = calculateTransactionTotal(transactions, thisMonthRange, 'DEPOSIT');
  const thisMonthWithdrawals = calculateTransactionTotal(transactions, thisMonthRange, 'WITHDRAWAL');
  const lastMonthDeposits = calculateTransactionTotal(transactions, lastMonthRange, 'DEPOSIT');
  const lastMonthWithdrawals = calculateTransactionTotal(transactions, lastMonthRange, 'WITHDRAWAL');
  
  // 计算涨幅
  const todayDepositsChange = calculateChangePercent(todayDeposits, yesterdayDeposits);
  const todayWithdrawalsChange = calculateChangePercent(todayWithdrawals, yesterdayWithdrawals);
  const thisWeekDepositsChange = calculateChangePercent(thisWeekDeposits, lastWeekDeposits);
  const thisWeekWithdrawalsChange = calculateChangePercent(thisWeekWithdrawals, lastWeekWithdrawals);
  const thisMonthDepositsChange = calculateChangePercent(thisMonthDeposits, lastMonthDeposits);
  const thisMonthWithdrawalsChange = calculateChangePercent(thisMonthWithdrawals, lastMonthWithdrawals);

  // 计算总余额
  const totalBalance = merchant ? merchant.balance : 0;

  return (
    <Box sx={{ p: 0 }}>
              <Typography 
                variant="h4" 
                gutterBottom
                sx={{ 
                  color: 'primary.main',
                  fontWeight: 'bold',
                  mb: 1
                }}
              >
                仪表板
              </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 总额行 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
        <StatCard
          title="总余额"
          value={formatAmount(totalBalance)}
          color="primary.main"
        />
        <StatCard
          title="可用余额"
          value={formatAmount(merchant.balance)}
          color="success.main"
        />
      </Box>

      {/* 代收行 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
        <StatCard
          title="今日代收"
          value={formatAmount(todayDeposits)}
          color="info.main"
          changePercent={todayDepositsChange}
          changeLabel="对比昨日同期"
        />
        <StatCard
          title="本周代收"
          value={formatAmount(thisWeekDeposits)}
          color="secondary.main"
          changePercent={thisWeekDepositsChange}
          changeLabel="对比上周同期"
        />
        <StatCard
          title="本月代收"
          value={formatAmount(thisMonthDeposits)}
          color="info.dark"
          changePercent={thisMonthDepositsChange}
          changeLabel="对比上月同期"
        />
      </Box>

      {/* 代付行 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 4 }}>
        <StatCard
          title="今日代付"
          value={formatAmount(todayWithdrawals)}
          color="warning.main"
          changePercent={todayWithdrawalsChange}
          changeLabel="对比昨日同期"
        />
        <StatCard
          title="本周代付"
          value={formatAmount(thisWeekWithdrawals)}
          color="error.main"
          changePercent={thisWeekWithdrawalsChange}
          changeLabel="对比上周同期"
        />
        <StatCard
          title="本月代付"
          value={formatAmount(thisMonthWithdrawals)}
          color="warning.dark"
          changePercent={thisMonthWithdrawalsChange}
          changeLabel="对比上月同期"
        />
      </Box>


    </Box>
  );
}

export default Dashboard;
