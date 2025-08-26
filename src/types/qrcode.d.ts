declare module 'qrcode' {
  interface QRToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: string;
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }

  export function toDataURL(text: string, opts?: QRToDataURLOptions): Promise<string>;
  export function toString(text: string, opts?: QRToDataURLOptions): Promise<string>;
  const _default: {
    toDataURL(text: string, opts?: QRToDataURLOptions): Promise<string>;
    toString(text: string, opts?: QRToDataURLOptions): Promise<string>;
  };
  export default _default;
}
