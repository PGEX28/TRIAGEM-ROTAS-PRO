import axios from 'axios';

const PRINT_AGENT_URL = import.meta.env.VITE_PRINT_AGENT_URL || 'http://localhost:8181';

export interface LocalPrinter {
  name: string;
  isDefault: boolean;
}

export class PrinterService {
  /**
   * Verifica se o Agente Local na porta 8181 está online
   */
  static async checkAgentStatus(): Promise<boolean> {
    try {
      const res = await axios.get(`${PRINT_AGENT_URL}/status`, { timeout: 1500 });
      return res.status === 200 && res.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Obtém a lista de impressoras do SO via Agente Local
   */
  static async getPrinters(): Promise<LocalPrinter[]> {
    try {
      const res = await axios.get(`${PRINT_AGENT_URL}/printers`, { timeout: 2000 });
      return res.data?.printers || [];
    } catch {
      return [{ name: 'Impressora Padrão do Navegador', isDefault: true }];
    }
  }

  /**
   * Envia dados ZPL/RAW para a impressora via agente local
   */
  static async printRaw(printerName: string, data: string, copies = 1): Promise<boolean> {
    try {
      const res = await axios.post(`${PRINT_AGENT_URL}/print/raw`, {
        printerName,
        data,
        copies,
      }, { timeout: 5000 });
      return res.data?.success === true;
    } catch (error) {
      console.error('Erro ao enviar para Print Agent:', error);
      return false;
    }
  }

  /**
   * Dispara impressão nativa do navegador (Fallback Web)
   */
  static printWeb(): void {
    window.print();
  }
}
