import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Smartphone,
  AccountBalanceWallet
} from '@mui/icons-material';
import { 
  PaymentProviderCategory
} from '../types';
import { paymentProviderService } from '../services/paymentProviderService';



export default function PaymentManagementNew() {
  // 支付商分类状态
  const [categories, setCategories] = useState<PaymentProviderCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProviderColor = (providerName: string) => {
    const colors: {[key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'default'} = {
      'airpay': 'primary',
      'cashfree': 'secondary',
      'razorpay': 'success',
      'paytm': 'warning',
      'passpay': 'error',
      'unispay': 'info'
    };
    return colors[providerName.toLowerCase()] || 'default';
  };



  const getTypeIcon = (type: string) => {
    if (type === 'wakeup') {
      return <Smartphone color="primary" />;
    }
    return <AccountBalanceWallet color="secondary" />;
  };

  // 加载支付商分类
  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const data = await paymentProviderService.getCategories();
        setCategories(data);
      } catch (err) {
        setError('加载支付商分类失败');
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    loadCategories();
  }, []);



  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          支付管理
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 支付商分类概览 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          支付商分类概览
        </Typography>
        {categoriesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {categories.map((category) => (
              <Box key={category.id} sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getTypeIcon(category.type)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {category.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {category.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {category.providers.map((provider) => (
                        <Chip
                          key={provider.id}
                          label={provider.displayName}
                          size="small"
                          color={getProviderColor(provider.name)}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}
      </Box>


    </Box>
  );
}
