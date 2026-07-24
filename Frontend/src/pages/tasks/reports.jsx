import { useState, useEffect } from 'react';
import axiosInstance from '@api/axiosInstance';
import TableGenerator from '@components/Common/TableGenerator';
import { BarChart3, PieChart, Calendar, Filter, TrendingUp, ChevronDown, X } from 'lucide-react';
import { MODULES, STAT_CARD, APP_SHELL } from '@constants/uiTokens';

const TaskReports = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('status');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchReport();
    }, [reportType, dateRange]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const reportConfig = getReportConfig(reportType);
            const response = await axiosInstance.post('/populate/report/tasks', {
                ...reportConfig,
                dateRange: {
                    ...dateRange,
                    dateField: 'createdAt'
                }
            });
            setReportData(response.data || []);
        } catch (error) {
            console.error('Error fetching report:', error);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    const getReportConfig = (type) => {
        const configs = {
            status: {
                type: 'summary',
                groupBy: 'status'
            },
            priority: {
                type: 'summary',
                groupBy: 'priorityLevel'
            },
            client: {
                type: 'summary',
                groupBy: 'clientId',
                populate: ['clientId']
            },
            assignee: {
                type: 'summary',
                groupBy: 'assignedTo',
                populate: ['assignedTo']
            },
            taskType: {
                type: 'summary',
                groupBy: 'taskTypeId',
                populate: ['taskTypeId']
            },
            projectType: {
                type: 'summary',
                groupBy: 'projectTypeId',
                populate: ['projectTypeId']
            },
            monthly: {
                type: 'summary',
                groupBy: 'createdAt',
                dateGrouping: 'month'
            },
            completion: {
                type: 'summary',
                groupBy: 'status',
                filter: { status: { $in: ['Completed', 'Approved'] } }
            }
        };
        return configs[type] || configs.status;
    };

    /**
     * Map status/priority strings to semantic color tokens
     * Using CSS variables for theme-aware colors (light/dark mode auto-switch)
     */
    const getStatusTokens = (value) => {
        const statusMap = {
            // Status tokens
            'Completed': { bg: 'bg-[rgb(209_250_229_/_var(--tw-bg-opacity))]', text: 'text-[#065F46]', darkText: 'dark:text-[#34D399]' },
            'Approved': { bg: 'bg-[rgb(209_250_229_/_var(--tw-bg-opacity))]', text: 'text-[#065F46]', darkText: 'dark:text-[#34D399]' },
            'In Progress': { bg: 'bg-[rgb(219_234_254_/_var(--tw-bg-opacity))]', text: 'text-[#1E40AF]', darkText: 'dark:text-[#93C5FD]' },
            'To Do': { bg: 'bg-[rgb(254_243_199_/_var(--tw-bg-opacity))]', text: 'text-[#92400E]', darkText: 'dark:text-[#FBBF24]' },
            'Pending': { bg: 'bg-[rgb(254_243_199_/_var(--tw-bg-opacity))]', text: 'text-[#92400E]', darkText: 'dark:text-[#FBBF24]' },
            // Priority tokens
            'High': { bg: 'bg-[rgb(254_226_226_/_var(--tw-bg-opacity))]', text: 'text-[#B91C1C]', darkText: 'dark:text-[#F87171]' },
            'Medium': { bg: 'bg-[rgb(254_243_199_/_var(--tw-bg-opacity))]', text: 'text-[#92400E]', darkText: 'dark:text-[#FBBF24]' },
            'Low': { bg: 'bg-[rgb(209_250_229_/_var(--tw-bg-opacity))]', text: 'text-[#065F46]', darkText: 'dark:text-[#34D399]' }
        };
        return statusMap[value] || { bg: 'bg-surface-chip', text: 'text-ink-muted', darkText: 'dark:text-ink-muted' };
    };

    const customRender = {
        _id: (row) => {
            const displayName = row.name || row._id || 'Unassigned';
            return <span className="font-medium text-ink">{displayName}</span>;
        },
        count: (row) => {
            const tokens = getStatusTokens(row._id);
            return (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${tokens.bg} ${tokens.text} ${tokens.darkText}`}>
                    {row.count}
                </span>
            );
        }
    };

    const reportOptions = [
        { value: 'status', label: 'By Status', icon: BarChart3 },
        { value: 'priority', label: 'By Priority', icon: TrendingUp },
        { value: 'client', label: 'By Client', icon: PieChart },
        { value: 'assignee', label: 'By Assignee', icon: PieChart },
        { value: 'taskType', label: 'By Task Type', icon: Filter },
        { value: 'projectType', label: 'By Project Type', icon: Filter },
        { value: 'monthly', label: 'Monthly Trend', icon: Calendar },
        { value: 'completion', label: 'Completion Rate', icon: BarChart3 }
    ];

    const totalTasks = reportData.reduce((sum, item) => sum + (item.count || 0), 0);
    const avgTasksPerGroup = totalTasks / (reportData.length || 1);
    const completedTasks = reportData.filter(item =>
        ['Completed', 'Approved'].includes(item._id)
    ).reduce((sum, item) => sum + (item.count || 0), 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const projectModule = MODULES.project;

    /**
     * StatPill component — matches KanbanBoard.jsx pattern
     * Compact display: count + label with semantic color tokens
     */
    const StatPill = ({ label, count, icon: Icon, tokenClass }) => (
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-tracker-md border border-hairline text-sm font-semibold whitespace-nowrap transition-all ${tokenClass}`}>
            {Icon && <Icon className="h-4 w-4" />}
            <span className="font-bold">{count}</span>
            <span className="opacity-75">{label}</span>
        </div>
    );

    return (
        <div className="tracker-page" data-module="project">
            <div className={APP_SHELL.content}>
                {/* Page Header */}
                <div className={APP_SHELL.pageHeader}>
                    <div>
                        <p className="text-xs font-semibold tracking-widest text-ink-subtle uppercase">{projectModule.eyebrow}</p>
                        <h1 className={APP_SHELL.pageTitle}>Task Reports</h1>
                        <p className={APP_SHELL.pageSubtitle}>Analytics and insights for task management</p>
                    </div>
                </div>

                {/* Premium Filter Section */}
                <div className="tracker-card-plain mb-6 overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-hairline-soft bg-gradient-to-r from-[var(--module-project-light)] to-surface">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-[var(--module-project)]" />
                            <h3 className="text-sm font-semibold text-ink">Report Filters</h3>
                        </div>
                    </div>

                    {/* Filters Grid */}
                    <div className="p-6 space-y-4">
                        {/* Primary Controls Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                            {/* Report Type - Larger */}
                            <div className="lg:col-span-5">
                                <label className="block text-xs font-semibold tracking-widest text-ink-subtle uppercase mb-2.5">
                                    <span className="flex items-center gap-1.5">
                                        <BarChart3 className="h-4 w-4" />
                                        Analysis Type
                                    </span>
                                </label>
                                <div className="relative group">
                                    <select
                                        value={reportType}
                                        onChange={(e) => setReportType(e.target.value)}
                                        className="lmx-input w-full appearance-none pr-10 text-sm font-medium cursor-pointer transition-all group-hover:border-[var(--module-project)] bg-surface"
                                        aria-label="Select report type"
                                    >
                                        {reportOptions.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none group-hover:text-[var(--module-project)] transition-colors" />
                                </div>
                            </div>

                            {/* Date Inputs Side by Side */}
                            <div className="lg:col-span-4 flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold tracking-widest text-ink-subtle uppercase mb-2.5">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            From
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="lmx-input w-full text-sm font-medium"
                                        aria-label="Start date"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold tracking-widest text-ink-subtle uppercase mb-2.5">To</label>
                                    <input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="lmx-input w-full text-sm font-medium"
                                        aria-label="End date"
                                    />
                                </div>
                            </div>

                            {/* Generate Button - Premium */}
                            <div className="lg:col-span-3 flex items-end">
                                <button
                                    onClick={fetchReport}
                                    disabled={loading}
                                    className={`w-full h-11 tracker-btn-accent flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 ${
                                        loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-[0_4px_12px_rgba(14,165,233,0.3)]'
                                    }`}
                                    aria-busy={loading}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <BarChart3 className="h-4 w-4" />
                                            Generate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Info Text */}
                        <div className="flex items-center justify-between pt-2 border-t border-hairline-soft">
                            <p className="text-xs text-ink-subtle">
                                📊 Analyzing {totalTasks} task{totalTasks !== 1 ? 's' : ''} across {reportData.length} categor{reportData.length !== 1 ? 'ies' : 'y'}
                            </p>
                            <p className="text-xs font-medium text-[var(--module-project)]">
                                Last updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Stats Pills */}
                <div className="flex items-center gap-2 flex-wrap mb-6 pb-2">
                    <StatPill
                        label="Total Tasks"
                        count={totalTasks}
                        icon={BarChart3}
                        tokenClass="bg-[var(--module-project-light)] text-[var(--module-project)]"
                    />
                    <StatPill
                        label="Categories"
                        count={reportData.length}
                        icon={PieChart}
                        tokenClass="bg-[#D1FAE5] text-[#059669]"
                    />
                    <StatPill
                        label="Avg per Category"
                        count={Math.round(avgTasksPerGroup)}
                        icon={Calendar}
                        tokenClass="bg-[#EDE9FE] text-[#7C3AED]"
                    />
                    <StatPill
                        label="Completion Rate"
                        count={`${completionRate}%`}
                        icon={TrendingUp}
                        tokenClass="bg-[#FFEDD5] text-[#C2410C]"
                    />
                </div>

                {/* Report Data Table */}
                <div className="tracker-card-plain overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-hairline">
                        <h2 className="text-lg font-semibold text-ink">
                            Report Data — {reportOptions.find(opt => opt.value === reportType)?.label}
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <TableGenerator
                            data={reportData}
                            customRender={customRender}
                            hiddenColumns={[]}
                            enableActions={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskReports;