declare module 'html2pdf.js' {
  function html2pdf(): Html2PdfObject;
  
  interface Html2PdfObject {
    from(element: HTMLElement | string): Html2PdfObject;
    set(options: any): Html2PdfObject;
    save(): Promise<void>;
    output(type: string, options?: any): Promise<any>;
    outputPdf(type: string, options?: any): Promise<any>;
    getContainer(): HTMLElement;
  }
  
  export default html2pdf;
}