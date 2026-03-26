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
    onSuccess: (data) => {
      setExpectedItems(data.data.items);
    },
  });

  const executePickMutation = useMutation({
    mutationFn: (data) => api.post('/picking/scan', data),
    onSuccess: (data) => {
      setScannedItems([...scannedItems, data.data.itemBarcode]);
      toast.success('Item picked successfully');
    },
    onError: () => {
      toast.error('Failed to pick item');
    },
  });

  const startSession = (trolley, rack) => {
    setTrolleyBarcode(trolley);
    setRackCompartmentBarcode(rack);
    startPickingMutation.mutate({ trolleyBarcode: trolley, rackCompartmentBarcode: rack });
  };

  const scanItem = (itemBarcode) => {
    executePickMutation.mutate({
      trolleyBarcode,
      rackCompartmentBarcode,
      itemBarcode,
    });
  };

  return {
    trolleyBarcode,
    rackCompartmentBarcode,
    scannedItems,
    expectedItems,
    startSession,
    scanItem,
    isLoading: startPickingMutation.isPending || executePickMutation.isPending,
  };
};
