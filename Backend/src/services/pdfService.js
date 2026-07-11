import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * OA PDF Generation Service
 * Generates a professional Order Acknowledgment Letter
 */
const pdfService = {
  async generateOA(oaData, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // --- Header ---
        doc.fontSize(20).text('ORDER ACKNOWLEDGMENT', { align: 'right' });
        doc.fontSize(10).text(`Date: ${new Date(oaData.createdAt).toLocaleDateString()}`, { align: 'right' });
        doc.text(`OA Number: ${oaData.oaNumber}`, { align: 'right' });
        doc.moveDown();

        // --- Parties ---
        const startY = doc.y;
        doc.fontSize(12).font('Helvetica-Bold').text('PROVIDER DETAILS');
        doc.font('Helvetica').fontSize(10).text('Tracker Solutions');
        doc.text('Support & Implementation Center');
        doc.text('Email: support@tracker.com');

        doc.y = startY;
        doc.font('Helvetica-Bold').fontSize(12).text('BUYER DETAILS', 200, startY);
        doc.font('Helvetica').fontSize(10).text(oaData.clientId?.name || oaData.clientName, 200);
        doc.text(`Contact: ${oaData.clientId?.email || 'N/A'}`, 200);
        doc.moveDown(4);

        // --- Table Header ---
        const tableTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Description', 50, tableTop);
        doc.text('Quantity', 250, tableTop, { width: 50, align: 'right' });
        doc.text('Rate', 320, tableTop, { width: 80, align: 'right' });
        doc.text('GST (%)', 410, tableTop, { width: 50, align: 'right' });
        doc.text('Total', 480, tableTop, { width: 80, align: 'right' });

        doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();
        doc.moveDown();

        // --- Table Items ---
        let currentY = tableTop + 25;
        (oaData.items || []).forEach(item => {
          doc.font('Helvetica').fontSize(9);
          doc.text(item.productName || 'N/A', 50, currentY, { width: 180 });
          doc.text((item.quantity || 0).toString(), 250, currentY, { width: 50, align: 'right' });
          doc.text((item.unitPrice || 0).toLocaleString(), 320, currentY, { width: 80, align: 'right' });
          doc.text((item.tax || 0).toString(), 410, currentY, { width: 50, align: 'right' });
          doc.text((item.total || 0).toLocaleString(), 480, currentY, { width: 80, align: 'right' });
          currentY += 20;
        });

        // --- Totals ---
        doc.moveTo(350, currentY).lineTo(560, currentY).stroke();
        currentY += 10;
        doc.font('Helvetica-Bold').text('Subtotal:', 350, currentY);
        doc.text((oaData.subtotal || 0).toLocaleString(), 480, currentY, { align: 'right' });
        
        currentY += 15;
        doc.text('GST Total:', 350, currentY);
        doc.text((oaData.taxTotal || 0).toLocaleString(), 480, currentY, { align: 'right' });

        currentY += 20;
        doc.fontSize(12).fillColor('#2563EB').text('GRAND TOTAL (Frozen):', 350, currentY);
        doc.text(`INR ${(oaData.committedPrice || 0).toLocaleString()}`, 480, currentY, { align: 'right' });

        // --- Footer ---
        doc.fillColor('#64748B').fontSize(8).text(
          'This is a system-generated Order Acknowledgment and represents a frozen commercial contract. No further modifications allowed without PM approval.',
          50, 700, { align: 'center', width: 500 }
        );

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  },

  async generateOfferLetter(candidateData, jobData, hrConfig, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // --- Header / Logo Area ---
        doc.fillColor('#1E293B').fontSize(22).font('Helvetica-Bold').text('TRACKER LOGIMAX ERP', { align: 'left' });
        doc.fontSize(10).font('Helvetica').fillColor('#64748B').text('Logimax Systems Pvt. Ltd. | Human Resources Department', { align: 'left' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#E2E8F0').lineWidth(1).stroke();
        doc.moveDown(2);

        // --- Document Title ---
        doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold').text('OFFER OF EMPLOYMENT', { align: 'center' });
        doc.fontSize(10).font('Helvetica').fillColor('#475569').text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.text(`Ref: LMX/OFFER/${candidateData._id.toString().slice(-6).toUpperCase()}`, { align: 'right' });
        doc.moveDown();

        // --- Candidate Address ---
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('To,');
        doc.font('Helvetica-Bold').fontSize(11).text(`${candidateData.firstName} ${candidateData.lastName || ''}`.trim());
        doc.font('Helvetica').fontSize(10).fillColor('#334155');
        doc.text(`Email: ${candidateData.email}`);
        doc.text(`Phone: ${candidateData.phone || 'N/A'}`);
        if (candidateData.address?.street) {
          doc.text(`${candidateData.address.street || ''}, ${candidateData.address.city || ''}`);
          doc.text(`${candidateData.address.state || ''} - ${candidateData.address.zip || ''}`);
        }
        doc.moveDown(2);

        // --- Subject & Salutation ---
        doc.font('Helvetica-Bold').fillColor('#0F172A').text(`Dear ${candidateData.firstName},`);
        doc.moveDown(0.5);
        doc.font('Helvetica').fillColor('#334155').text(
          `We are pleased to offer you employment with Logimax Systems Pvt. Ltd. in the position of ${jobData.title || 'Software Developer'}. We were highly impressed by your credentials and look forward to welcoming you to our team.`,
          { align: 'justify', lineGap: 2 }
        );
        doc.moveDown();

        // --- Key Details ---
        doc.font('Helvetica-Bold').text('Position & Compensation Details:');
        doc.moveDown(0.5);
        doc.font('Helvetica');
        doc.text(`• Department: ${jobData.departmentName || 'Engineering'}`);
        doc.text(`• Designation: ${jobData.designationName || jobData.title || 'Developer'}`);
        doc.text(`• Offered CTC: INR ${(candidateData.offeredSalary || 0).toLocaleString()} per annum`);
        doc.text(`• Joining Date: ${candidateData.joiningDate ? new Date(candidateData.joiningDate).toLocaleDateString() : 'To Be Confirmed'}`);
        doc.text(`• Offer Validity: Until ${candidateData.offerExpiryDate ? new Date(candidateData.offerExpiryDate).toLocaleDateString() : 'N/A'}`);
        
        doc.moveDown(1.5);

        // --- Who to Contact for What Section ---
        doc.font('Helvetica-Bold').fillColor('#1E3A8A').text('🔑 Key Contact Info (Who to Contact for What):');
        doc.moveDown(0.5);
        
        doc.font('Helvetica-Bold').fillColor('#0F172A').text('1. Onboarding & Documentation Formalities:');
        doc.font('Helvetica').fillColor('#334155').text(`   • Contact: Human Resources (HR) Department`);
        doc.text(`   • Email: ${hrConfig.hrEmail || 'hr@logimax.com'}`);
        doc.text('   • Purpose: Submitting personal ID proofs, signing NDA, and verification of background letters.');
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fillColor('#0F172A').text('2. IT Assets & Setup (Laptop, Software Accounts):');
        doc.font('Helvetica').fillColor('#334155').text(`   • Contact: IT Service Desk Team`);
        doc.text(`   • Email: ${hrConfig.itEmail || 'it@logimax.com'}`);
        doc.text('   • Purpose: Requesting company laptop assignment, email portal, and dev environment setup.');
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fillColor('#0F172A').text('3. Reporting, Team Induction & Tasks:');
        doc.font('Helvetica').fillColor('#334155').text(`   • Contact: ${hrConfig.managerName || 'Your Reporting Manager'}`);
        doc.text(`   • Email: ${hrConfig.managerEmail || 'manager@logimax.com'}`);
        doc.text('   • Purpose: Initial team induction training, tasks alignment, and shift assignment planning.');
        
        doc.moveDown(1.5);

        // --- Signature ---
        doc.font('Helvetica').fillColor('#334155').text('Please review the offer details. We request you to accept the offer by signing and returning a copy to us.');
        doc.moveDown(1.5);
        
        doc.font('Helvetica-Bold').text('For Logimax Systems Pvt. Ltd.,');
        doc.moveDown(2.5);
        doc.font('Helvetica-Bold').text('Authorized HR Signatory');

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }
};

export default pdfService;
