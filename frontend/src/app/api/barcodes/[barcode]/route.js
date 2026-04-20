import { createCanvas } from 'canvas';
import JsBarcode from 'jsbarcode';

export async function GET(request, { params }) {
  const { barcode } = await params;
  const value = decodeURIComponent(barcode).replace(/\.png$/, '');

  try {
    // Create canvas — width will be auto-sized by JsBarcode
    const canvas = createCanvas(400, 120);

    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 70,
      displayValue: true,
      fontSize: 13,
      margin: 10,
      background: '#ffffff',
      lineColor: '#000000',
      fontOptions: 'bold',
    });

    const buffer = canvas.toBuffer('image/png');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    // Return a 1x1 transparent PNG on error
    const empty = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    return new Response(empty, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
  }
}
