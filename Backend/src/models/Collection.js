// models/collection.js
import employees from "./Employee.js";
import departments from "./Department.js";
import designations from "./Designation.js";
import leavetypes from "./LeaveTypes.js";
import leavepolicy from "./LeavePolicy.js";
import attendances from "./Attendance.js";
import sidebars from "./SideBar.js";
import tasktypes from "./TaskType.js";
import clients from "./Client.js";
import dailyactivities from "./DailyActivity.js";
import apihitlogs from "./ApiHitLog.js";
import projecttypes from "./ProjectType.js";
import accesspolicies from "./AccessPolicies.js";
import roles from "./Role.js";
import notifications from "./notification.js";
import leaves from "./Leave.js"
import tasks from "./Tasks.js"
import commentsthreads from "./CommentsThreads.js"
import session from "./Session.js";
import todos from "./Todo.js";
import auditlog from "./AuditLog.js";
import errorlog from "./ErrorLog.js";
import expenses from "./Expense.js";
import payrolls from "./Payroll.js";
import tickets from "./Ticket.js";
import { Shift as shifts, ShiftAssignment as shiftassignments } from "./Shift.js";
import hrpolicies from "./HRPolicy.js";
import agents from "./Agent.js";
import milestones from "./MileStone.js";
import regularizations from "./Regularization.js";
import emailconfigs from "./EmailConfig.js";
import referencetypes from "./ReferenceType.js";
import leadtypes from "./LeadType.js";
import feedgroups from "./FeedGroup.js";
import feedchannels from "./FeedChannel.js";
import feedposts from "./FeedPost.js";
import feedcomments from "./FeedComment.js";
import NotificationReceptionist from "./NotificationReceptionist.js";
import notificationpreferences from "./NotificationPreference.js";
import products from "./products.js";
import quotations from "./Quotation.js";
import crmmeetings from "./CRMMeeting.js";
import orderacknowledgments from "./OrderAcknowledgment.js";
import salarystructures from "./SalaryStructure.js";
import payrollruns from "./PayrollRun.js";
import holidays from "./Holiday.js";
import statusconfigs from "./StatusConfig.js";
import statusmappings from "./StatusMapping.js";
import dashboardwidgets from "./DashboardWidget.js";
import activitylogs from "./ActivityLog.js";
import timetrackersessions from "./TimeTrackerSession.js";
import approvalworkflows from "./ApprovalWorkflow.js";
import escalationworkflows from "./EscalationWorkflow.js";
import workflows from "./Workflow.js";
import wfhrequests from "./WFHRequest.js";
import compoffrequests from "./CompOffRequest.js";
import resources from "./Resource.js";
import capabilities from "./Capability.js";
import grants from "./Grant.js";
import attendancepolicies from "./AttendancePolicy.js";
import leavetransactions from "./LeaveTransaction.js";
import payments from "./Payment.js";
import generalsettings from "./GeneralSettings.js";
import operationalevents from "./OperationalEvent.js";
import notificationrules from "./NotificationRule.js";
import notificationdeliveries from "./NotificationDelivery.js";

// Activity-Centric Work Model
import jobcategories from "./JobCategory.js";
import jobtypes from "./JobType.js";

// CRM & Recruitment
import crmactivities from "./CRMActivity.js";
import jobopenings from "./JobOpening.js";
import candidates from "./Candidate.js";
import onboardings from "./Onboarding.js";
import employeedocuments from "./EmployeeDocument.js";


// CRM Pipeline Models
import serviceproviders from "./ServiceProvider.js";
import contacts from "./Contact.js";
import quotationrevisions from "./QuotationRevision.js";
import orderacknowledgements from "./OrderAcknowledgement.js";
import paymentjournals from "./PaymentJournal.js";
import clientledgers from "./ClientLedger.js";
import periodclosures from "./PeriodClosure.js";

// Asset Management
import assetcategories from "./AssetCategory.js";
import assets from "./Asset.js";
import assetallocations from "./AssetAllocation.js";
import assetincidents from "./AssetIncident.js";
import assetrepairs from "./AssetRepair.js";
import assetvendors from "./AssetVendor.js";
import assetpurchases from "./AssetPurchase.js";
import assetinvoices from "./AssetInvoice.js";
import assetpayments from "./AssetPayment.js";
import assetstockledgers from "./AssetStockLedger.js";

// Ticket Sub-entities
import ticket_comments from "./TicketComment.js";
import ticket_comment_reads from "./TicketCommentRead.js";
import ticket_attachments from "./TicketAttachment.js";
import ticket_activity_logs from "./TicketActivityLog.js";
import ticket_assignments from "./TicketAssignment.js";
import ticket_participants from "./TicketParticipant.js";
import ticket_status_history from "./TicketStatusHistory.js";
import sprints from "./Sprint.js";
import employeetaskqueues from "./EmployeeTaskQueue.js";
import employeetaskqueuerequests from "./EmployeeTaskQueueRequest.js";


const models = {
  generalsettings,
  accesspolicies,
  employees,
  departments,
  designations,
  leavetypes,
  leavepolicy,
  attendances,
  sidebars,
  tasktypes,
  clients,
  dailyactivities,
  apihitlogs,
  projecttypes,
  roles,
  notifications,
  leaves,
  tasks,
  commentsthreads,
  session,
  todos,
  auditlog,
  errorlog,
  expenses,
  payrolls,
  tickets,
  shifts,
  shiftassignments,
  hrpolicies,
  agents,
  emailconfigs,
  milestones,
  regularizations,
  referencetypes,
  leadtypes,
  feedgroups,
  feedchannels,
  feedposts,
  feedcomments,
  NotificationReceptionist,
  notificationpreferences,
  notificationrules,
  notificationdeliveries,
  products,
  quotations,
  crmmeetings,
  orderacknowledgments,
  salarystructures,
  payrollruns,
  holidays,
  statusconfigs,
  statusmappings,
  dashboardwidgets,
  activitylogs,
  timetrackersessions,
  approvalworkflows,
  escalationworkflows,
  workflows,
  ticket_comments,
  ticket_comment_reads,
  ticket_attachments,
  ticket_activity_logs,
  ticket_assignments,
  ticket_participants,
  ticket_status_history,
  wfhrequests,
  compoffrequests,
  resources,
  // Asset Management
  assetcategories,
  assets,
  assetallocations,
  assetincidents,
  assetrepairs,
  assetvendors,
  assetpurchases,
  assetinvoices,
  assetpayments,
  assetstockledgers,
  capabilities,
  grants,
  attendancepolicies,
  leavetransactions,
  payments,
  // Activity-Centric Work Model
  jobcategories,
  jobtypes,
  crmactivities,
  jobopenings,
  candidates,
  onboardings,
  // CRM
  serviceproviders,
  contacts,
  quotations,
  quotationrevisions,
  orderacknowledgements,
  paymentjournals,
  clientledgers,
  periodclosures,
  sprints,
  employeetaskqueues,
  employeetaskqueuerequests,
  operationalevents,
  employeedocuments,
};

export default models;
