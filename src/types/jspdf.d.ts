declare module 'jspdf' {
  export interface jsPDFOptions {
    orientation?: 'portrait' | 'landscape' | 'p' | 'l';
    unit?: 'pt' | 'mm' | 'cm' | 'in' | 'px';
    format?: string | number[];
  }

  export class jsPDF {
    constructor(options?: jsPDFOptions);
    addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void;
    save(filename?: string): void;
    output(type?: string): string;
  }

  const _default: typeof jsPDF;
  export default _default;
}
