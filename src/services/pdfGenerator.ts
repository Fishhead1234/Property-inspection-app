import { jsPDF } from 'jspdf';
import type { InspectionReport } from '../types/inspection';

/**
 * Generates an executive A4 PDF Inspection Report directly in the client browser.
 * Capped to standard A4 (210 x 297 mm) with clean typography, page breaks, photo appendix,
 * and signature blocks.
 */
export async function generateA4PDF(report: InspectionReport): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const primaryColor = [15, 23, 42]; // Slate 900 #0F172A
  const accentColor = [2, 132, 199]; // Sky 600 #0284C7
  const borderColor = [226, 232, 240]; // Slate 200 #E2E8F0
  const textMuted = [100, 116, 139]; // Slate 500 #64748B

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      currentY = margin + 12; // Leave room for running header
      renderRunningHeader();
    }
  };

  const renderRunningHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(report.propertyAddress || 'Property Inspection Report', margin, margin);
    const dateFormatted = new Date(report.inspectionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    doc.text(dateFormatted, pageWidth - margin, margin, { align: 'right' });
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 2, pageWidth - margin, margin + 2);
  };

  // ==========================================
  // PAGE 1: COVER & EXECUTIVE SUMMARY
  // ==========================================

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, currentY, contentWidth, 26, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('PROPERTY CONDITION REPORT', margin + 8, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 242, 254);
  const typeLabel = report.inspectionType.toUpperCase().replace('-', ' ') + ' INSPECTION';
  doc.text(`${typeLabel} • ${report.inspectorCompany || 'InspectA4 Official'}`, margin + 8, currentY + 19);

  currentY += 32;

  // Property Details Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, currentY, contentWidth, 48, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. PROPERTY & INSPECTION DETAILS', margin + 6, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Left Column
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Property Address:', margin + 6, currentY + 17);
  doc.text('Inspection Date:', margin + 6, currentY + 25);
  doc.text('Tenant / Client:', margin + 6, currentY + 33);
  doc.text('Landlord / Agency:', margin + 6, currentY + 41);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(report.propertyAddress || 'N/A', margin + 38, currentY + 17);
  doc.text(report.inspectionDate || 'N/A', margin + 38, currentY + 25);
  doc.text(report.tenantName || 'N/A', margin + 38, currentY + 33);
  doc.text(report.landlordName || 'N/A', margin + 38, currentY + 41);

  // Right Column
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Lead Inspector:', margin + 105, currentY + 17);
  doc.text('Inspector Phone:', margin + 105, currentY + 25);
  doc.text('Inspector Email:', margin + 105, currentY + 33);
  doc.text('Keys Handover:', margin + 105, currentY + 41);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(report.inspectorName || 'N/A', margin + 135, currentY + 17);
  doc.text(report.inspectorPhone || 'N/A', margin + 135, currentY + 25);
  doc.text(report.inspectorEmail || 'N/A', margin + 135, currentY + 33);
  doc.text(`${report.keysHandover?.keysProvided || 0} Keys / ${report.keysHandover?.remotesProvided || 0} Remotes`, margin + 135, currentY + 41);

  currentY += 54;

  // Executive Summary Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. EXECUTIVE SUMMARY & OVERALL CONDITION', margin + 6, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const summaryText = report.generalSummary || 'All inspected areas were recorded in detail with photos and condition ratings below.';
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 12);
  doc.text(splitSummary, margin + 6, currentY + 14);

  currentY += 34;

  // Summary Metrics Pills
  const cleanCount = report.areas.filter(a => a.overallCondition === 'clean').length;
  const fairCount = report.areas.filter(a => a.overallCondition === 'fair').length;
  const damagedCount = report.areas.filter(a => a.overallCondition === 'damaged').length;
  const totalPhotos = report.areas.reduce((acc, a) => acc + (a.photos?.length || 0), 0);

  const pillWidth = (contentWidth - 9) / 4;
  const renderStatPill = (x: number, label: string, val: string, bg: number[], textColor: number[]) => {
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.roundedRect(x, currentY, pillWidth, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(val, x + pillWidth / 2, currentY + 7.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, x + pillWidth / 2, currentY + 12.5, { align: 'center' });
  };

  renderStatPill(margin, 'Clean / Undamaged', `${cleanCount}`, [220, 252, 231], [22, 101, 52]);
  renderStatPill(margin + pillWidth + 3, 'Fair / Minor Wear', `${fairCount}`, [254, 243, 199], [146, 64, 14]);
  renderStatPill(margin + (pillWidth + 3) * 2, 'Action / Damaged', `${damagedCount}`, [254, 226, 226], [153, 27, 27]);
  renderStatPill(margin + (pillWidth + 3) * 3, 'Evidence Photos', `${totalPhotos}`, [224, 242, 254], [7, 89, 133]);

  currentY += 22;

  // Area Quick Index Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. INSPECTED AREAS OVERVIEW', margin, currentY + 4);
  currentY += 8;

  // Table header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Area / Room', margin + 4, currentY + 4.8);
  doc.text('Condition Rating', margin + 80, currentY + 4.8);
  doc.text('Checklist Items', margin + 120, currentY + 4.8);
  doc.text('Photos', margin + 160, currentY + 4.8);
  currentY += 7;

  report.areas.forEach((area, idx) => {
    checkPageBreak(8);
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, currentY, contentWidth, 6.5, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(margin, currentY + 6.5, margin + contentWidth, currentY + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(area.name, margin + 4, currentY + 4.5);

    // Condition pill badge
    let badgeText = 'CLEAN';
    let badgeBg = [220, 252, 231];
    let badgeColor = [22, 101, 52];
    if (area.overallCondition === 'fair') {
      badgeText = 'FAIR WEAR';
      badgeBg = [254, 243, 199];
      badgeColor = [146, 64, 14];
    } else if (area.overallCondition === 'damaged') {
      badgeText = 'DAMAGED';
      badgeBg = [254, 226, 226];
      badgeColor = [153, 27, 27];
    }

    doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
    doc.roundedRect(margin + 80, currentY + 1.2, 22, 4.2, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.text(badgeText, margin + 91, currentY + 4.2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`${area.items?.length || 0} fixtures`, margin + 120, currentY + 4.5);
    doc.text(`${area.photos?.length || 0} photos`, margin + 160, currentY + 4.5);

    currentY += 6.5;
  });

  // ==========================================
  // PAGE 2+: DETAILED ROOM CHECKLISTS
  // ==========================================
  doc.addPage();
  currentY = margin + 12;
  renderRunningHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. DETAILED FIXTURE & ROOM CHECKLISTS', margin, currentY);
  currentY += 8;

  report.areas.forEach((area) => {
    checkPageBreak(25);

    // Area Header
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Area: ${area.name}`, margin + 4, currentY + 5.5);

    // Rating text on right
    doc.setFontSize(8);
    const condStr = `Condition: ${area.overallCondition.toUpperCase()}`;
    doc.text(condStr, pageWidth - margin - 4, currentY + 5.5, { align: 'right' });
    currentY += 10;

    // Items table
    if (area.items && area.items.length > 0) {
      area.items.forEach((item, itemIdx) => {
        checkPageBreak(7);
        const isAlt = itemIdx % 2 === 1;
        if (isAlt) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 4, currentY, contentWidth - 8, 6, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`• ${item.name}`, margin + 6, currentY + 4.2);

        // Condition
        let tag = 'Clean';
        doc.setTextColor(22, 101, 52);
        if (item.condition === 'fair') {
          tag = 'Fair';
          doc.setTextColor(146, 64, 14);
        } else if (item.condition === 'damaged') {
          tag = 'Damaged';
          doc.setTextColor(153, 27, 27);
        } else if (item.condition === 'na') {
          tag = 'N/A';
          doc.setTextColor(100, 116, 139);
        }
        doc.setFont('helvetica', 'bold');
        doc.text(tag, margin + 90, currentY + 4.2);

        // Comment
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const comment = item.comment ? item.comment : 'No defect noted';
        const truncatedComment = comment.length > 45 ? comment.substring(0, 42) + '...' : comment;
        doc.text(truncatedComment, margin + 115, currentY + 4.2);

        currentY += 6;
      });
    }

    if (area.notes && area.notes.trim().length > 0) {
      checkPageBreak(8);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(`Notes: ${area.notes}`, margin + 6, currentY + 4);
      currentY += 6;
    }

    currentY += 4;
  });

  // ==========================================
  // PHOTO APPENDIX PAGES
  // ==========================================
  // Collect all photos with area names
  const allPhotosWithArea: Array<{ areaName: string; photo: typeof report.areas[0]['photos'][0] }> = [];
  report.areas.forEach(area => {
    if (area.photos && area.photos.length > 0) {
      area.photos.forEach(photo => {
        allPhotosWithArea.push({ areaName: area.name, photo });
      });
    }
  });

  if (allPhotosWithArea.length > 0) {
    doc.addPage();
    currentY = margin + 12;
    renderRunningHeader();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('5. HIGH-RESOLUTION PHOTO EVIDENCE APPENDIX', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Total Evidence Photos: ${allPhotosWithArea.length} (Optimized for clarity & compact file size)`, margin, currentY + 4.5);
    currentY += 10;

    const photoColWidth = (contentWidth - 6) / 2; // ~88mm wide
    const photoImgHeight = 62; // ~62mm tall
    const cardHeight = photoImgHeight + 18; // Includes caption & metadata

    for (let i = 0; i < allPhotosWithArea.length; i += 2) {
      checkPageBreak(cardHeight + 4);

      const renderSinglePhotoCard = (item: typeof allPhotosWithArea[0], x: number) => {
        // Card frame
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.roundedRect(x, currentY, photoColWidth, cardHeight, 1.5, 1.5, 'FD');

        // Draw Image
        try {
          doc.addImage(item.photo.dataUrl, 'JPEG', x + 2, currentY + 2, photoColWidth - 4, photoImgHeight);
        } catch (e) {
          // Fallback if SVG dataUrl or image rendering error
          doc.setFillColor(226, 232, 240);
          doc.rect(x + 2, currentY + 2, photoColWidth - 4, photoImgHeight, 'F');
          doc.setFontSize(8);
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.text('Photo Evidence', x + photoColWidth / 2, currentY + photoImgHeight / 2, { align: 'center' });
        }

        // Area & Caption Box
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(item.areaName, x + 3, currentY + photoImgHeight + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        const caption = item.photo.caption || 'Inspection photographic record';
        const splitCap = doc.splitTextToSize(caption, photoColWidth - 6);
        doc.text(splitCap, x + 3, currentY + photoImgHeight + 10.5);

        // Date and size tag
        const sizeKb = Math.round(item.photo.compressedSize / 1024);
        doc.setFontSize(6.5);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(`${new Date(item.photo.takenAt).toLocaleDateString()} • ${sizeKb} KB`, x + photoColWidth - 3, currentY + photoImgHeight + 6, { align: 'right' });
      };

      // Photo 1 (Left column)
      renderSinglePhotoCard(allPhotosWithArea[i], margin);

      // Photo 2 (Right column if exists)
      if (i + 1 < allPhotosWithArea.length) {
        renderSinglePhotoCard(allPhotosWithArea[i + 1], margin + photoColWidth + 6);
      }

      currentY += cardHeight + 6;
    }
  }

  // ==========================================
  // FINAL PAGE: SIGNATURES & DECLARATIONS
  // ==========================================
  checkPageBreak(75);
  if (currentY > pageHeight - margin - 85) {
    doc.addPage();
    currentY = margin + 12;
    renderRunningHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('6. DECLARATIONS & DIGITAL SIGNATURES', margin, currentY);
  currentY += 6;

  // Declaration text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const declText =
    'By signing below, the inspector certifies that this property inspection was performed objectively and reflects the true condition of the premises on the date indicated. The tenant acknowledges receipt of this report and evidence photos.';
  doc.text(doc.splitTextToSize(declText, contentWidth), margin, currentY);
  currentY += 10;

  const sigBoxWidth = (contentWidth - 8) / 2;
  const sigBoxHeight = 44;

  // Inspector Signature Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Inspector Signature & Sign-off', margin + 4, currentY + 6);

  if (report.signatures?.inspector?.signatureData) {
    try {
      doc.addImage(report.signatures.inspector.signatureData, 'PNG', margin + 6, currentY + 8, sigBoxWidth - 12, 22);
    } catch (e) {
      doc.text('(Digitally signed on file)', margin + 6, currentY + 20);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('(Signature on file)', margin + 6, currentY + 22);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Name: ${report.signatures?.inspector?.name || report.inspectorName || 'Alex Mercer'}`, margin + 4, currentY + 36);
  doc.text(`Date: ${report.signatures?.inspector?.date || report.inspectionDate}`, margin + 4, currentY + 40);

  // Tenant / Client Signature Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + sigBoxWidth + 8, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Tenant / Client Acknowledgement', margin + sigBoxWidth + 12, currentY + 6);

  if (report.signatures?.tenant?.signatureData) {
    try {
      doc.addImage(report.signatures.tenant.signatureData, 'PNG', margin + sigBoxWidth + 14, currentY + 8, sigBoxWidth - 12, 22);
    } catch (e) {
      doc.text('(Digitally signed on file)', margin + sigBoxWidth + 14, currentY + 20);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('(Client acknowledgement pending)', margin + sigBoxWidth + 14, currentY + 22);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Name: ${report.signatures?.tenant?.name || report.tenantName || 'Sarah & Liam Jenkins'}`, margin + sigBoxWidth + 12, currentY + 36);
  doc.text(`Date: ${report.signatures?.tenant?.date || report.inspectionDate}`, margin + sigBoxWidth + 12, currentY + 40);

  // ==========================================
  // FOOTER: PAGE NUMBERS ON ALL PAGES
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - margin - 2, pageWidth - margin, pageHeight - margin - 2);

    doc.text('InspectA4 Certified Inspection Report • Generated with Smart Compression', margin, pageHeight - margin + 2);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - margin + 2, { align: 'right' });
  }

  return doc.output('blob');
}

/**
 * Convenience helper to trigger a direct browser file download for the generated A4 PDF
 */
export async function downloadA4PDF(report: InspectionReport): Promise<void> {
  const blob = await generateA4PDF(report);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const cleanAddress = (report.propertyAddress || 'Inspection_Report').replace(/[^a-zA-Z0-9]/g, '_');
  a.href = url;
  a.download = `${cleanAddress}_${report.inspectionDate}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
