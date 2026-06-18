declare module "pdf-parse" {
  interface PdfData { text: string; numpages: number; info: unknown; }
  function pdf(data: Buffer | Uint8Array): Promise<PdfData>;
  export default pdf;
}
