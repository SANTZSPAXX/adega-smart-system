import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, CartItem, Sale, SaleItem, Product } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    register_name?: string;
    operator_name?: string;
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

  // Caixa info instead of cliente
  if (sale.register_name || sale.operator_name) {
    const caixaInfo = sale.operator_name 
      ? `${sale.register_name || 'Caixa'} | ${sale.operator_name}`
      : sale.register_name || 'Caixa';
    doc.text(`Caixa: ${caixaInfo}`, 5, y);
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
    'dinheiro_cartao': 'Dinheiro + Cartão',
    'pix_cartao': 'PIX + Cartão',
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

// Cash Register Closing Report PDF
export const generateCashRegisterClosingPDF = (
  register: {
    id: string;
    register_name: string;
    operator_name?: string;
    opening_balance: number;
    closing_balance: number;
    cash_sales: number;
    card_sales: number;
    pix_sales: number;
    deposits: number;
    withdrawals: number;
    opened_at: string;
    closed_at: string;
  },
  sales: Array<{
    id: string;
    created_at: string;
    total: number;
    payment_method: string;
    items: Array<{ product_name: string; quantity: number; total_price: number }>;
  }>,
  companyName: string = 'TechControl PDV'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(14);
  doc.text('Relatório de Fechamento de Caixa', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Register info box
  doc.setFillColor(0, 150, 136);
  doc.rect(14, y, pageWidth - 28, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  const caixaTitle = register.operator_name 
    ? `${register.register_name} | ${register.operator_name}`
    : register.register_name;
  doc.text(caixaTitle, pageWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`ID: ${register.id.substring(0, 8).toUpperCase()}`, pageWidth / 2, y + 15, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 28;

  // Period info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Abertura: ${format(new Date(register.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, y);
  y += 5;
  doc.text(`Fechamento: ${format(new Date(register.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, y);
  y += 10;

  // Summary box
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(14, y, pageWidth - 28, 45);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Financeiro', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  
  const col1 = 20;
  const col2 = pageWidth / 2;
  let summaryY = y + 16;
  
  doc.text('Saldo Inicial:', col1, summaryY);
  doc.text(formatCurrency(register.opening_balance), col1 + 50, summaryY);
  
  doc.text('Suprimentos:', col2, summaryY);
  doc.text(formatCurrency(register.deposits), col2 + 40, summaryY);
  summaryY += 6;
  
  doc.text('Vendas Dinheiro:', col1, summaryY);
  doc.text(formatCurrency(register.cash_sales), col1 + 50, summaryY);
  
  doc.text('Sangrias:', col2, summaryY);
  doc.text(formatCurrency(register.withdrawals), col2 + 40, summaryY);
  summaryY += 6;
  
  doc.text('Vendas Cartão:', col1, summaryY);
  doc.text(formatCurrency(register.card_sales), col1 + 50, summaryY);
  
  doc.text('Vendas PIX:', col2, summaryY);
  doc.text(formatCurrency(register.pix_sales), col2 + 40, summaryY);
  summaryY += 8;
  
  doc.setFont('helvetica', 'bold');
  const totalSales = register.cash_sales + register.card_sales + register.pix_sales;
  const expectedBalance = register.opening_balance + register.cash_sales + register.deposits - register.withdrawals;
  
  doc.text('Total Vendas:', col1, summaryY);
  doc.setTextColor(0, 150, 0);
  doc.text(formatCurrency(totalSales), col1 + 50, summaryY);
  doc.setTextColor(0, 0, 0);
  
  doc.text('Saldo Esperado:', col2, summaryY);
  doc.text(formatCurrency(expectedBalance), col2 + 40, summaryY);
  
  y += 50;
  
  // Closing balance comparison
  const difference = register.closing_balance - expectedBalance;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Saldo Final Conferido:', 14, y);
  doc.text(formatCurrency(register.closing_balance), pageWidth - 14, y, { align: 'right' });
  y += 6;
  
  if (difference !== 0) {
    doc.text('Diferença:', 14, y);
    doc.setTextColor(difference > 0 ? 0 : 255, difference > 0 ? 150 : 0, 0);
    doc.text(`${difference > 0 ? '+' : ''}${formatCurrency(difference)}`, pageWidth - 14, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }
  y += 12;
  
  // Sales list
  if (sales.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Vendas do Período:', 14, y);
    y += 4;
    
    const paymentLabels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      cartao_credito: 'Crédito',
      cartao_debito: 'Débito',
      pix: 'PIX',
      'dinheiro_cartao': 'Din+Cart',
      'pix_cartao': 'PIX+Cart',
    };
    
    autoTable(doc, {
      startY: y,
      head: [['Hora', 'Venda', 'Itens', 'Pagamento', 'Total']],
      body: sales.map(sale => [
        format(new Date(sale.created_at), "HH:mm", { locale: ptBR }),
        `#${sale.id.substring(0, 6)}`,
        sale.items.reduce((sum, i) => sum + i.quantity, 0).toString(),
        paymentLabels[sale.payment_method] || sale.payment_method,
        formatCurrency(sale.total),
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [0, 150, 136],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 30 },
        4: { cellWidth: 30, halign: 'right' },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Sistema desenvolvido por TechControl - WhatsApp: (11) 95661-4601', pageWidth / 2, y, { align: 'center' });

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

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;

  doc.text('Data de Emissão:', leftCol, y);
  doc.text(format(new Date(invoice.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }), leftCol + 40, y);
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

  if (invoice.customer_cpf) {
    doc.setFontSize(10);
    doc.text('CPF/CNPJ do Cliente:', leftCol, y);
    doc.text(invoice.customer_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'), leftCol + 45, y);
    y += 8;
  }

  if (invoice.items && invoice.items.length > 0) {
    autoTable(doc, {
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
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

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

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`ICMS: ${formatCurrency(invoice.icms_value)} | PIS: ${formatCurrency(invoice.pis_value)} | COFINS: ${formatCurrency(invoice.cofins_value)}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Sistema desenvolvido por TechControl - WhatsApp: (11) 95661-4601', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('www.techcontrol.com.br', pageWidth / 2, y, { align: 'center' });

  return doc;
};

export const generateStockPDF = (
  products: Product[],
  companyName: string = 'TechControl PDV'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(12);
  doc.text('Relatório de Estoque Atual', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Produto', 'Código', 'Estoque', 'Mínimo', 'Preço Venda', 'Valor em Estoque']],
    body: products.map(product => [
      product.name,
      product.barcode || '-',
      product.stock_quantity.toString(),
      product.min_stock.toString(),
      formatCurrency(Number(product.sale_price) || 0),
      formatCurrency((Number(product.sale_price) || 0) * product.stock_quantity),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [0, 150, 136],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  const totalItems = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const totalValue = products.reduce((sum, p) => sum + ((Number(p.sale_price) || 0) * p.stock_quantity), 0);
  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock).length;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo:', 14, y);
  y += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de Produtos: ${products.length}`, 14, y);
  doc.text(`Itens em Estoque: ${totalItems}`, pageWidth / 2, y);
  y += 5;
  doc.text(`Valor Total em Estoque: ${formatCurrency(totalValue)}`, 14, y);
  doc.text(`Produtos com Estoque Baixo: ${lowStockCount}`, pageWidth / 2, y);
  y += 10;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Sistema desenvolvido por TechControl - WhatsApp: (11) 95661-4601', pageWidth / 2, y, { align: 'center' });

  return doc;
};

export const generateSalesReportPDF = (
  sales: Array<{
    id: string;
    created_at: string;
    total: number;
    payment_method: string;
    items: Array<{ product_name: string; quantity: number; total_price: number }>;
  }>,
  companyName: string = 'TechControl PDV'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(12);
  doc.text('Relatório de Vendas', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  const paymentLabels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    cartao_credito: 'Crédito',
    cartao_debito: 'Débito',
    pix: 'PIX',
    'dinheiro_cartao': 'Dinheiro+Cartão',
    'pix_cartao': 'PIX+Cartão',
  };

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Venda', 'Itens', 'Pagamento', 'Total']],
    body: sales.map(sale => [
      format(new Date(sale.created_at), "dd/MM/yy HH:mm", { locale: ptBR }),
      `#${sale.id.substring(0, 8)}`,
      sale.items.length.toString(),
      paymentLabels[sale.payment_method] || sale.payment_method,
      formatCurrency(sale.total),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [0, 150, 136],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35 },
      4: { cellWidth: 35, halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo:', 14, y);
  y += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de Vendas: ${sales.length}`, 14, y);
  doc.text(`Itens Vendidos: ${totalItems}`, pageWidth / 2, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Valor Total: ${formatCurrency(totalSales)}`, 14, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Sistema desenvolvido por TechControl - WhatsApp: (11) 95661-4601', pageWidth / 2, y, { align: 'center' });

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
