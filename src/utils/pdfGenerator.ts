import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Invoice, CartItem, Sale, SaleItem } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const generateReceiptPDF = (
  sale: {
    id: string;
    items: { product_name: string; quantity: number; unit_price: number; total_price: number }[];
    total: number;
    discount: number;
    payment_method: string;
    created_at: string;
    customer_name?: string;
  },
  companyName: string = 'TechControl PDV'
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200 + sale.items.length * 8],
  });

  const pageWidth = 80;
  let y = 10;

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema desenvolvido por TechControl', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('WhatsApp: (11) 95661-4601', pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Separator
  doc.setLineWidth(0.1);
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  // Sale info
  doc.setFontSize(8);
  doc.text(`Venda: #${sale.id.substring(0, 8).toUpperCase()}`, 5, y);
  y += 4;
  doc.text(`Data: ${format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 5, y);
  y += 4;

  if (sale.customer_name) {
    doc.text(`Cliente: ${sale.customer_name}`, 5, y);
    y += 4;
  }

  // Separator
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  // Items header
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', 5, y);
  doc.text('QTD', 40, y, { align: 'center' });
  doc.text('VALOR', pageWidth - 5, y, { align: 'right' });
  y += 4;

  // Items
  doc.setFont('helvetica', 'normal');
  sale.items.forEach((item) => {
    // Product name (may wrap)
    const name = item.product_name.length > 20 
      ? item.product_name.substring(0, 20) + '...' 
      : item.product_name;
    doc.text(name, 5, y);
    y += 3;
    
    doc.text(`${formatCurrency(item.unit_price)}`, 5, y);
    doc.text(`x${item.quantity}`, 40, y, { align: 'center' });
    doc.text(formatCurrency(item.total_price), pageWidth - 5, y, { align: 'right' });
    y += 5;
  });

  // Separator
  doc.line(5, y, pageWidth - 5, y);
  y += 4;

  // Totals
  const subtotal = sale.total + sale.discount;
  doc.text('Subtotal:', 5, y);
  doc.text(formatCurrency(subtotal), pageWidth - 5, y, { align: 'right' });
  y += 4;

  if (sale.discount > 0) {
    doc.text('Desconto:', 5, y);
    doc.setTextColor(255, 0, 0);
    doc.text(`-${formatCurrency(sale.discount)}`, pageWidth - 5, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', 5, y);
  doc.text(formatCurrency(sale.total), pageWidth - 5, y, { align: 'right' });
  y += 5;

  // Payment method
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const paymentLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    pix: 'PIX',
  };
  doc.text(`Pagamento: ${paymentLabels[sale.payment_method] || sale.payment_method}`, 5, y);
  y += 6;

  // Footer
  doc.line(5, y, pageWidth - 5, y);
  y += 4;
  doc.setFontSize(7);
  doc.text('Obrigado pela preferência!', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('TechControl - Soluções em Tecnologia', pageWidth / 2, y, { align: 'center' });

  return doc;
};

export const generateInvoicePDF = (
  invoice: Invoice & { items?: { product_name: string; quantity: number; unit_price: number; total_price: number }[] },
  companySettings?: {
    company_name?: string;
    trade_name?: string;
    cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
  }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header with company info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companySettings?.company_name || 'EMPRESA', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (companySettings?.cnpj) {
    doc.text(`CNPJ: ${companySettings.cnpj}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }
  if (companySettings?.address) {
    doc.text(`${companySettings.address} - ${companySettings.city}/${companySettings.state}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  // Invoice type and number
  y += 5;
  doc.setFillColor(0, 150, 136);
  doc.rect(14, y, pageWidth - 28, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `${invoice.invoice_type.toUpperCase()} Nº ${invoice.invoice_number?.toString().padStart(9, '0')} - Série ${invoice.series}`,
    pageWidth / 2,
    y + 8,
    { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
  y += 20;

  // Invoice details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;

  doc.text('Data de Emissão:', leftCol, y);
  doc.text(format(new Date(invoice.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), leftCol + 40, y);
  
  doc.text('Status:', rightCol, y);
  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    authorized: 'Autorizada',
    cancelled: 'Cancelada',
    denied: 'Rejeitada',
  };
  doc.text(statusLabels[invoice.status] || invoice.status, rightCol + 20, y);
  y += 6;

  if (invoice.authorization_date) {
    doc.text('Data de Autorização:', leftCol, y);
    doc.text(format(new Date(invoice.authorization_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), leftCol + 40, y);
  }
  
  if (invoice.protocol_number) {
    doc.text('Protocolo:', rightCol, y);
    doc.text(invoice.protocol_number, rightCol + 25, y);
  }
  y += 6;

  // Access key
  if (invoice.access_key) {
    y += 4;
    doc.setFontSize(8);
    doc.text('Chave de Acesso:', leftCol, y);
    y += 4;
    doc.setFont('courier', 'normal');
    doc.text(invoice.access_key, leftCol, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  }

  // Customer info
  if (invoice.customer_cpf) {
    doc.setFontSize(10);
    doc.text('CPF/CNPJ do Cliente:', leftCol, y);
    doc.text(invoice.customer_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'), leftCol + 45, y);
    y += 8;
  }

  // Items table
  if (invoice.items && invoice.items.length > 0) {
    doc.autoTable({
      startY: y,
      head: [['Produto', 'Qtd', 'Preço Unit.', 'Total']],
      body: invoice.items.map(item => [
        item.product_name,
        item.quantity.toString(),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [0, 150, 136],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // Totals
  const totalsX = pageWidth - 70;
  doc.setFontSize(10);
  
  doc.text('Total Produtos:', totalsX, y);
  doc.text(formatCurrency(invoice.total_products), pageWidth - 20, y, { align: 'right' });
  y += 5;

  if (invoice.total_discount > 0) {
    doc.text('Desconto:', totalsX, y);
    doc.setTextColor(255, 0, 0);
    doc.text(`-${formatCurrency(invoice.total_discount)}`, pageWidth - 20, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalsX, y);
  doc.text(formatCurrency(invoice.total_invoice), pageWidth - 20, y, { align: 'right' });
  y += 10;

  // Taxes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`ICMS: ${formatCurrency(invoice.icms_value)} | PIS: ${formatCurrency(invoice.pis_value)} | COFINS: ${formatCurrency(invoice.cofins_value)}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Sistema desenvolvido por TechControl - WhatsApp: (11) 95661-4601', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('www.techcontrol.com.br', pageWidth / 2, y, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const printPDF = (doc: jsPDF) => {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
};
