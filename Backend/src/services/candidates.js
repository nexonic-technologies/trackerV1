/**
 * candidates.js — Service hooks for recruitment pipeline.
 * Handles stage transitions, interview scheduling, offer/rejection,
 * and auto-creates Employee + Onboarding on Hired.
 */
export default function candidates() {
  return {
    async beforeCreate(ctx) {
      const { body, user } = ctx;
      body.createdBy = user?.id;
      body.stage = body.stage || 'Applied';
      body.stageHistory = [{
        stage: body.stage,
        movedAt: new Date(),
        movedBy: user?.id,
        note: 'Application submitted'
      }];
      return body;
    },

    async beforeUpdate(ctx) {
      const { body, docId, user } = ctx;
      const userId = user?.id;
      if (!docId) return body;
      const { default: Candidate } = await import('../models/Candidate.js');
      const existing = await Candidate.findById(docId).lean();
      if (!existing) throw new Error('Candidate not found');

      if (body.stage && body.stage !== existing.stage) {
        const VALID = {
          Applied: ['Screening', 'Rejected', 'Withdrawn'],
          Screening: ['Interview', 'Rejected', 'Withdrawn'],
          Interview: ['Offered', 'Rejected', 'Withdrawn'],
          Offered: ['Hired', 'Rejected', 'Withdrawn'],
        };
        const allowed = VALID[existing.stage] || [];
        if (!allowed.includes(body.stage)) {
          throw new Error(`Invalid stage transition: ${existing.stage} → ${body.stage}`);
        }
        body.$push = body.$push || {};
        body.$push.stageHistory = {
          stage: body.stage, movedAt: new Date(), movedBy: userId, note: body.stageNote || ''
        };
        delete body.stageNote;
      }
      body._oldStage = existing.stage;
      return body;
    },

    async afterUpdate(ctx) {
      const { docId, body, user } = ctx;
      const userId = user?.id;
      if (!docId) return;
      const { default: Candidate } = await import('../models/Candidate.js');
      const candidate = await Candidate.findById(docId).lean();
      if (!candidate) return;

      // ─── STAGE: Offered ────────────────────────────────────────────────────
      if (body._oldStage !== 'Offered' && candidate.stage === 'Offered') {
        try {
          const { default: JobOpening } = await import('../models/JobOpening.js');
          const { default: Department } = await import('../models/Department.js');
          const { default: Designation } = await import('../models/Designation.js');
          const { default: Employee } = await import('../models/Employee.js');
          const { default: EmailConfig } = await import('../models/EmailConfig.js');
          const { default: pdfService } = await import('./pdfService.js');
          const nodemailer = await import('nodemailer');
          const fs = await import('fs');
          const path = await import('path');
          const { fileURLToPath } = await import('url');

          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);

          const job = candidate.jobOpeningId ? await JobOpening.findById(candidate.jobOpeningId).lean() : null;
          const dept = job?.department ? await Department.findById(job.department).lean() : null;
          const desg = job?.designation ? await Designation.findById(job.designation).lean() : null;

          // Fetch Reporting Manager details
          let managerName = 'Your Assigned Reporting Manager';
          let managerEmail = 'manager@company.com';
          if (body.reportingManager) {
            const mgrObj = await Employee.findById(body.reportingManager).lean();
            if (mgrObj) {
              managerName = `${mgrObj.basicInfo?.firstName || ''} ${mgrObj.basicInfo?.lastName || ''}`.trim();
              managerEmail = mgrObj.authInfo?.workEmail || mgrObj.basicInfo?.email || 'manager@company.com';
            }
          }

          const jobData = {
            title: job?.title || 'Software Developer',
            departmentName: dept?.name || 'Engineering',
            designationName: desg?.title || 'Software Developer'
          };

          const hrConfig = {
            hrEmail: 'hr@Workhub.com',
            itEmail: 'it@Workhub.com',
            managerName,
            managerEmail
          };

          const uploadsDir = path.resolve(__dirname, '../../uploads/offer_letters');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const pdfFilename = `offer_${candidate._id.toString()}_${Date.now()}.pdf`;
          const pdfPath = path.join(uploadsDir, pdfFilename);

          await pdfService.generateOfferLetter(candidate, jobData, hrConfig, pdfPath);

          // Update Candidate with offerLetterUrl
          const relativeUrl = `/uploads/offer_letters/${pdfFilename}`;
          const { default: CandidateModel } = await import('../models/Candidate.js');
          await CandidateModel.findByIdAndUpdate(docId, { offerLetterUrl: relativeUrl });

          // Send email with PDF offer letter attachment
          const emailConfig = await EmailConfig.findOne();
          if (emailConfig && emailConfig.enabled) {
            const transporter = nodemailer.createTransport({
              host: emailConfig.host,
              port: emailConfig.port,
              secure: emailConfig.port === 465,
              auth: { user: emailConfig.username, pass: emailConfig.password },
              tls: { rejectUnauthorized: false }
            });

            const emailSubject = `Official Offer of Employment - Workhub Systems Pvt. Ltd.`;
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 25px; border-radius: 8px; color: #1e293b;">
                <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Congratulations ${candidate.firstName}!</h2>
                <p>Dear ${candidate.firstName},</p>
                <p>We are delighted to offer you the position of <strong>${jobData.title}</strong> at Workhub Systems Pvt. Ltd. Your skills and experience will be a valuable addition to our team.</p>
                
                <p>Please find attached your official <strong>Offer of Employment</strong> letter containing detailed information about your position, compensation, and onboarding process.</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <h4 style="margin: 0 0 10px 0; color: #1e293b;">🔑 Key Contacts (Who to Contact for What):</h4>
                  <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li><strong>Onboarding & Documentation Formalities:</strong> Contact the HR Team at <a href="mailto:${hrConfig.hrEmail}">${hrConfig.hrEmail}</a> to submit your ID proofs, sign the NDA, and clear background checks.</li>
                    <li><strong>IT Assets & Setup (Laptop assignment):</strong> Contact the IT Service Desk at <a href="mailto:${hrConfig.itEmail}">${hrConfig.itEmail}</a> for laptop assignment and dev credentials.</li>
                    <li><strong>Reporting, Team Induction & Training:</strong> Contact your reporting manager, <strong>${hrConfig.managerName}</strong>, at <a href="mailto:${hrConfig.managerEmail}">${hrConfig.managerEmail}</a> to align on team schedules and training.</li>
                  </ul>
                </div>
                
                <p>Please review the details in the attached PDF. To accept the offer, sign the document and return it to us before the expiry date: <strong>${candidate.offerExpiryDate ? new Date(candidate.offerExpiryDate).toLocaleDateString() : 'N/A'}</strong>.</p>
                
                <p style="margin-top: 30px;">Best Regards,</p>
                <p><strong>Human Resources Department</strong><br>Workhub Systems Pvt. Ltd.</p>
              </div>
            `;

            await transporter.sendMail({
              from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
              to: candidate.email,
              subject: emailSubject,
              html: emailHtml,
              attachments: [
                {
                  filename: `Offer_Letter_${candidate.firstName}.pdf`,
                  path: pdfPath
                }
              ]
            });
            console.log(`[CandidatesHook] Offer letter generated and emailed to ${candidate.email}`);
          } else {
            console.warn('[CandidatesHook] SMTP email skipped: service not enabled or configured.');
          }
        } catch (err) {
          console.error('[CandidatesHook] Offered stage hook error:', err.message);
        }
      }

      // ─── STAGE: Hired ──────────────────────────────────────────────────────
      if (body._oldStage !== 'Hired' && candidate.stage === 'Hired') {
        try {
          const { default: Employee } = await import('../models/Employee.js');
          const { default: JobOpening } = await import('../models/JobOpening.js');
          const { default: Onboarding } = await import('../models/Onboarding.js');
          const bcrypt = await import('bcryptjs');
          const job = candidate.jobOpeningId ? await JobOpening.findById(candidate.jobOpeningId).lean() : null;

          let hashedPassword = '';
          if (body.password) {
            const salt = await bcrypt.genSalt(12);
            hashedPassword = await bcrypt.hash(body.password, salt);
          }

          const emp = await Employee.create({
            basicInfo: {
              firstName: candidate.firstName,
              lastName: candidate.lastName || '',
              email: candidate.email,
              phone: candidate.phone || '',
              dob: candidate.dob || null,
              gender: candidate.gender || null,
              maritalStatus: candidate.maritalStatus || null,
              fatherName: candidate.fatherName || '',
              motherName: candidate.motherName || '',
              address: candidate.address || {},
            },
            professionalInfo: {
              empId: body.empId || `EMP-${Date.now().toString().slice(-6)}`,
              role: body.role || null,
              department: job?.department || null,
              designation: job?.designation || null,
              dateOfJoining: candidate.joiningDate || new Date(),
              employmentType: job?.jobType || 'Full-Time',
              reportingManager: body.reportingManager || null,
              isActive: true,
            },
            authInfo: {
              workEmail: body.workEmail || candidate.email,
              password: hashedPassword
            }
          });

          await Candidate.findByIdAndUpdate(docId, { employeeId: emp._id });

          // 1. Attempt to load dynamic onboarding workflow checklist template
          let checklist = [];
          try {
            const { default: Workflow } = await import('../models/Workflow.js');
            const onboardingWorkflow = await Workflow.findOne({
              modelName: 'onboardings',
              triggerType: 'Onboarding',
              isActive: true
            }).lean();

            if (onboardingWorkflow && onboardingWorkflow.steps && onboardingWorkflow.steps.length > 0) {
              checklist = onboardingWorkflow.steps.map(step => ({
                task: step.requiredDocumentType ? `Upload ${step.requiredDocumentType}` : (step.updateStatusTo || 'Onboarding task'),
                category: step.requiredDocumentType ? 'Documents' : 'Other',
                documentType: step.requiredDocumentType || null,
                isCompleted: false
              }));
            }
          } catch (wfErr) {
            console.warn('[CandidatesHook] Failed to load onboarding workflow:', wfErr.message);
          }

          // 2. Fallback: seed the 12 approved default document slots if no workflow config exists
          if (checklist.length === 0) {
            const defaultDocTypes = [
              'Resume', 'Photo', 'PAN', 'Aadhaar', 'Passport', 'Degree',
              'Experience Letter', 'Relieving Letter', 'Offer Letter',
              'Joining Letter', 'Bank Proof', 'Medical Certificate'
            ];
            checklist = defaultDocTypes.map(docType => ({
              task: `Upload ${docType}`,
              category: 'Documents',
              documentType: docType,
              isCompleted: false
            }));

            // Append default non-document setup steps
            checklist.push(
              { task: 'Laptop/desktop allocation', category: 'IT Setup', isCompleted: false },
              { task: 'Email & tool access', category: 'IT Setup', isCompleted: false },
              { task: 'NDA & agreement signed', category: 'HR Formalities', isCompleted: false },
              { task: 'Department induction', category: 'Training', isCompleted: false }
            );
          }

          await Onboarding.create({
            employeeId: emp._id, candidateId: candidate._id,
            joiningDate: candidate.joiningDate || new Date(),
            department: job?.department, designation: job?.designation, createdBy: userId,
            reportingTo: body.reportingManager || null,
            checklist
          });

          if (candidate.jobOpeningId) {
            await JobOpening.findByIdAndUpdate(candidate.jobOpeningId, { $inc: { filled: 1 } });
          }
        } catch (err) {
          console.error('[candidates.afterUpdate] Hired→Employee error:', err.message);
        }
      }
    }
  };
}
