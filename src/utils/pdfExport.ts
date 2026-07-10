import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../types';

export const exportInvoiceToPDF = (invoice: Invoice) => {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text('CreditBridge Institutional Invoice', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Generated on: ' + new Date().toLocaleDateString(), 14, 30);

  autoTable(doc, {
    startY: 40,
    head: [['Field', 'Details']],
    body: [
      ['Invoice ID', invoice.id],
      ['Partner Name', invoice.partnerName],
      ['Industry', invoice.industry],
      ['Face Value', '$' + invoice.amount.toLocaleString()],
      ['Target Fund', '$' + invoice.targetAmount.toLocaleString()],
      ['Yield (APR)', invoice.annualReturn + '%'],
      ['Maturity Date', invoice.dueDate],
      ['Status', invoice.status],
      ['Risk Rating', invoice.risk],
      ['Tokenized By', invoice.creatorWallet],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 130 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.text(
    'This document represents an on-chain tokenized receivable asset on the CreditBridge protocol.',
    14,
    finalY
  );

  doc.save('CreditBridge_Invoice_' + invoice.id + '.pdf');
};
