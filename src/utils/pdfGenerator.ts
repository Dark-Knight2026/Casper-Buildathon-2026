import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TaxYearSummary, SCHEDULE_E_CATEGORIES } from '@/types/landlordTax';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface ScheduleEData {
  taxYear: number;
  taxpayerName: string;
  taxpayerSSN: string;
  properties: Array<{
    address: string;
    rentalIncome: number;
    expenses: Array<{
      category: string;
      lineNumber: string;
      amount: number;
    }>;
    depreciation: number;
    netIncome: number;
  }>;
  totalIncome: number;
  totalExpenses: number;
  totalDepreciation: number;
  netRentalIncome: number;
}

interface Form1099Data {
  taxYear: number;
  payerName: string;
  payerTIN: string;
  payerAddress: string;
  recipientName: string;
  recipientTIN: string;
  recipientAddress: string;
  amount: number;
  formType: '1099-MISC' | '1099-NEC';
  boxNumber: string;
}

export class PDFGenerator {
  // Generate Schedule E PDF
  static generateScheduleE(data: ScheduleEData): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SCHEDULE E', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    
    doc.setFontSize(12);
    doc.text('(Form 1040)', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    
    doc.setFontSize(10);
    doc.text('Supplemental Income and Loss', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Taxpayer Information
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.taxpayerName}`, 20, yPos);
    yPos += 7;
    doc.text(`Social Security Number: ${data.taxpayerSSN}`, 20, yPos);
    yPos += 7;
    doc.text(`Tax Year: ${data.taxYear}`, 20, yPos);
    yPos += 12;

    // Part I: Income or Loss From Rental Real Estate
    doc.setFont('helvetica', 'bold');
    doc.text('Part I - Income or Loss From Rental Real Estate', 20, yPos);
    yPos += 10;

    // Process each property
    data.properties.forEach((property, index) => {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`Property ${index + 1}: ${property.address}`, 20, yPos);
      yPos += 7;

      // Income section
      doc.setFont('helvetica', 'normal');
      doc.text('3. Rents received', 25, yPos);
      doc.text(`$${property.rentalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 40, yPos, { align: 'right' });
      yPos += 10;

      // Expenses section
      doc.setFont('helvetica', 'bold');
      doc.text('Expenses:', 25, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'normal');
      property.expenses
        .sort((a, b) => parseInt(a.lineNumber) - parseInt(b.lineNumber))
        .forEach(expense => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${expense.lineNumber}. ${expense.category}`, 30, yPos);
          doc.text(`$${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 40, yPos, { align: 'right' });
          yPos += 6;
        });

      // Net income for this property
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Net rental income (loss)', 25, yPos);
      doc.text(
        `$${property.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - 40,
        yPos,
        { align: 'right' }
      );
      yPos += 15;
    });

    // Summary section
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.text('Total Rental Income:', 25, yPos);
    doc.text(`$${data.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 40, yPos, { align: 'right' });
    yPos += 7;

    doc.text('Total Expenses:', 25, yPos);
    doc.text(`$${data.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 40, yPos, { align: 'right' });
    yPos += 7;

    doc.text('Total Depreciation:', 25, yPos);
    doc.text(`$${data.totalDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 40, yPos, { align: 'right' });
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Net Rental Income (Loss):', 25, yPos);
    doc.text(
      `$${data.netRentalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - 40,
      yPos,
      { align: 'right' }
    );

    // Footer
    yPos = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('For informational purposes only. Consult a tax professional before filing.', pageWidth / 2, yPos, { align: 'center' });

    return doc;
  }

  // Generate Form 1099 PDF
  static generateForm1099(data: Form1099Data): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Form ${data.formType}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const formTitle = data.formType === '1099-NEC' 
      ? 'Nonemployee Compensation' 
      : 'Miscellaneous Income';
    doc.text(formTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.text(`Tax Year ${data.taxYear}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Payer Information
    doc.setFont('helvetica', 'bold');
    doc.text('PAYER\'S Information', 20, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.payerName}`, 25, yPos);
    yPos += 6;
    doc.text(`TIN: ${data.payerTIN}`, 25, yPos);
    yPos += 6;
    doc.text(`Address: ${data.payerAddress}`, 25, yPos);
    yPos += 15;

    // Recipient Information
    doc.setFont('helvetica', 'bold');
    doc.text('RECIPIENT\'S Information', 20, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.recipientName}`, 25, yPos);
    yPos += 6;
    doc.text(`TIN: ${data.recipientTIN}`, 25, yPos);
    yPos += 6;
    doc.text(`Address: ${data.recipientAddress}`, 25, yPos);
    yPos += 15;

    // Amount Information
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT', 20, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    const boxLabel = data.formType === '1099-NEC'
      ? 'Box 1 - Nonemployee compensation'
      : `Box ${data.boxNumber} - ${data.boxNumber === '1' ? 'Rents' : 'Other income'}`;
    
    doc.text(boxLabel, 25, yPos);
    yPos += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, yPos);
    yPos += 20;

    // Instructions
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Copy for Recipient', 20, yPos);
    yPos += 7;
    doc.text('This is important tax information and is being furnished to the IRS.', 20, yPos);
    yPos += 5;
    doc.text('If you are required to file a return, a negligence penalty or other sanction may be imposed', 20, yPos);
    yPos += 5;
    doc.text('on you if this income is taxable and the IRS determines that it has not been reported.', 20, yPos);

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    yPos = pageHeight - 15;
    doc.setFontSize(8);
    doc.text('For informational purposes only. Consult a tax professional before filing.', pageWidth / 2, yPos, { align: 'center' });

    return doc;
  }

  // Generate Tax Summary Report PDF
  static generateTaxSummary(summary: TaxYearSummary, landlordName: string): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Summary Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tax Year ${summary.taxYear}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.text(`Prepared for: ${landlordName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Summary Metrics
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, yPos);
    yPos += 10;

    const summaryData = [
      ['Total Rental Income', `$${summary.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Total Expenses', `$${summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Total Depreciation', `$${summary.totalDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Net Rental Income', `$${summary.netRentalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Number of Properties', summary.propertySummaries.length.toString()]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right', cellWidth: 70 }
      }
    });

    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPos + 50;

    // Property Breakdown
    doc.setFont('helvetica', 'bold');
    doc.text('Property Breakdown', 20, yPos);
    yPos += 10;

    const propertyData = summary.propertySummaries.map(prop => [
      prop.address,
      `$${prop.income.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `$${prop.expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `$${prop.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Property', 'Income', 'Expenses', 'Net Income']],
      body: propertyData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 }
      }
    });

    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : yPos + 50;

    // Expense Categories
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Expense Categories', 20, yPos);
    yPos += 10;

    const expenseData = summary.expensesByCategory
      .filter(cat => cat.amount > 0)
      .sort((a, b) => SCHEDULE_E_CATEGORIES[a.category].lineNumber - SCHEDULE_E_CATEGORIES[b.category].lineNumber)
      .map(cat => [
        SCHEDULE_E_CATEGORIES[cat.category].lineNumber.toString(),
        SCHEDULE_E_CATEGORIES[cat.category].name,
        `$${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        cat.transactionCount.toString()
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Line', 'Category', 'Amount', 'Transactions']],
      body: expenseData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 90 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'center', cellWidth: 35 }
      }
    });

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    yPos = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('For informational purposes only. Consult a tax professional before filing.', pageWidth / 2, yPos, { align: 'center' });

    return doc;
  }

  // Helper method to download PDF
  static downloadPDF(doc: jsPDF, filename: string): void {
    doc.save(filename);
  }
}