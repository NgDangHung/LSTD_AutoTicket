declare module 'html2canvas' {
  interface Options {
    backgroundColor?: string | null;
    scale?: number;
    logging?: boolean;
    useCORS?: boolean;
  }

  function html2canvas(element: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
  export default html2canvas;
}
