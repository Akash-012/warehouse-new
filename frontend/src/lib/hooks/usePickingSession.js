'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../api';
import { toast } from 'sonner';

export const usePickingSession = () => {
  const [trolleyBarcode, setTrolleyBarcode] = useState('');
  const [rackCompartmentBarcode, setRackCompartmentBarcode] = useState('');
  const [scannedItems, setScannedItems] = useState([]);
  const [expectedItems, setExpectedItems] = useState([]);

  const startPickingMutation = useMutation({
    mutationFn: (data) => api.post('/picking/start', data),
    onSuccess: ({ data }) => {
      const items = data?.items ?? [];
      setExpectedItems(items);
      if (items.length === 0) {
        toast.warning('No pending pick tasks found for this order');
      } else {
        toast.success(`Session started — ${items.length} items to pick`);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to start picking session');
    },
  });

  const executePickMutation = useMutation({
    mutationFn: (data) => api.post('/picking/scan', data),
    onSuccess: ({ data }) => {
      const scannedBarcode = data?.itemBarcode;
      if (scannedBarcode) {
        setScannedItems((prev) => [...prev, scannedBarcode]);
      }
      toast.success('Item picked successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to pick item');
    },
  });

  const startSession = (trolley, rack, salesOrderId) => {
    setTrolleyBarcode(trolley ?? '');
    setRackCompartmentBarcode(rack ?? '');
    setScannedItems([]);
    startPickingMutation.mutate({
      trolleyBarcode: trolley || undefined,
      rackCompartmentBarcode: rack || undefined,
      salesOrderId: Number(salesOrderId),
    });
  };

  const scanItem = (itemBarcode) => {
    executePickMutation.mutate({
      itemBarcode,
      trolleyBarcode: trolleyBarcode || undefined,
      rackCompartmentBarcode: rackCompartmentBarcode || undefined,
    });
  };

  const resetSession = () => {
    setTrolleyBarcode('');
    setRackCompartmentBarcode('');
    setScannedItems([]);
    setExpectedItems([]);
  };

  return {
    trolleyBarcode,
    rackCompartmentBarcode,
    scannedItems,
    expectedItems,
    startSession,
    scanItem,
    resetSession,
    isLoading: startPickingMutation.isPending || executePickMutation.isPending,
  };
};
