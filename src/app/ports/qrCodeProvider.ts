export interface QRCodeProvider {
  generateDataUrl(content: string): Promise<string>;
}
