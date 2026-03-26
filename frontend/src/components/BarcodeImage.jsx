'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function BarcodeImage({ barcode, className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const src = `/api/barcodes/${encodeURIComponent(barcode)}.png`;

  const handleDownload = async () => {
    const response = await fetch(src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${barcode}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>${barcode}</title></head>
        <body style="margin:0;display:grid;place-items:center;min-height:100vh;">
          <img src="${src}" style="max-width:90vw;" onload="window.print();window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={className}>
      {!loaded ? <Skeleton className="h-16 w-44" /> : null}
      <Image
        src={src}
        alt={`Barcode ${barcode}`}
        width={176}
        height={64}
        unoptimized
        className={loaded ? 'max-h-16 w-auto' : 'hidden'}
        onLoad={() => setLoaded(true)}
      />
      <div className="mt-2 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-4" />
          Download
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
