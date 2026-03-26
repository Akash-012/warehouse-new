'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import BarcodeImage from '@/components/BarcodeImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, ScanLine, Plus, X, Printer } from 'lucide-react';

const TYPE_OPTIONS = ['Item', 'Bin', 'Trolley'];

export default function LabelsPage() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [labelType, setLabelType] = useState('Item');
  const [barcodes, setBarcodes] = useState([]);

  const addBarcode = (e) => {
    e.preventDefault();
    const val = barcodeInput.trim();
    if (val && !barcodes.find((b) => b.value === val)) {
      setBarcodes((prev) => [...prev, { value: val, type: labelType }]);
      setBarcodeInput('');
    }
  };

  const removeBarcode = (val) => setBarcodes((prev) => prev.filter((b) => b.value !== val));

  return (
    <div className="flex flex-col gap-6">
      


      <form onSubmit={addBarcode} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-9 font-mono text-sm"
            placeholder="Enter barcodeâ€¦"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
          />
        </div>
        {/* Type selector */}
        <div className="flex rounded-lg border border-input overflow-hidden shrink-0">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setLabelType(t)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                labelType === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={!barcodeInput.trim()} size="sm">
          <Plus className="size-4 mr-1.5" />
          Add
        </Button>
      </form>

      {barcodes.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Tag className="size-12 opacity-30" />
          <p className="text-sm">Add barcodes above to generate labels</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3">
          {barcodes.map((bc) => (
            <div
              key={bc.value}
              className="glass-card rounded-2xl p-4 flex flex-col gap-3 relative group print:border print:shadow-none"
            >
              <button
                onClick={() => removeBarcode(bc.value)}
                className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all print:hidden"
              >
                <X className="size-3.5" />
              </button>
              <div className="flex items-center gap-1.5 print:hidden">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  bc.type === 'Item' ? 'bg-blue-500/12 text-blue-600' :
                  bc.type === 'Bin'  ? 'bg-emerald-500/12 text-emerald-600' :
                  'bg-amber-500/12 text-amber-600'
                }`}>{bc.type}</span>
              </div>
              <BarcodeImage barcode={bc.value} className="w-full" />
              <p className="text-center font-mono text-xs text-muted-foreground truncate">{bc.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
