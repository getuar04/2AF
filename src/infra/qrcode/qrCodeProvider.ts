import QRCode from "qrcode";
import { QRCodeProvider } from "../../app/ports/qrCodeProvider";

export class QrCodeProvider implements QRCodeProvider {
  async generateDataUrl(content: string): Promise<string> {
    return QRCode.toDataURL(content);
  }
}
