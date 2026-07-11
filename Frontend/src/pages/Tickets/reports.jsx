import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import TableGenerator from '../../components/Common/TableGenerator';
import { BarChart3, PieChart, Calendar, Filter } from 'lucide-react';

const TicketReports = () => {
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
            const response = await axiosInstance.post('/populate/report/tickets', {
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
                groupBy: 'priority'
            },
            type: {
                type: 'summary',
                groupBy: 'type'
            },
            assignee: {
                type: 'summary',
                groupBy: 'assignedTo',
                populate: ['assignedTo']
            },
            product: {
                type: 'summary',
                groupBy: 'product'
            },
            monthly: {
                type: 'summary',
                groupBy: 'createdAt',
                dateGrouping: 'month'
            }
        };
        return configs[type] || configs.status;
    };

    const customRender = {
        _id: (row) => {
            if (reportType === 'assignee' && row.name) {
                return <span className="font-medium">{row.name}</span>;
            }
            return <span className="font-medium">{row._id || 'Unassigned'}</span>;
        },
        count: (row) => (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {row.count}
            </span>
        )
    };

    const reportOptions = [
        { value: 'status', label: 'By Status', icon: BarChart3 },
        { value: 'priority', label: 'By Priority', icon: PieChart },
        { value: 'type', label: 'By Type', icon: Filter },
        { value: 'assignee', label: 'By Assignee', icon: PieChart },
        { value: 'product', label: 'By Product', icon: BarChart3 },
        { value: 'monthly', label: 'Monthly Trend', icon: Calendar }
    ];

    const totalTickets = reportData.reduce((sum, item) => sum + (item.count || 0), 0);
    const avgTicketsPerGroup = totalTickets / (reportData.length || 1);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Ticket Reports</h1>
                    <p className="text-gray-600 text-sm">Analytics and insights for ticket management</p>
                </div>
            </div>
            {/* Controls */}
            <div className="bg-white rounded-lg border p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {reportOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Loading...' : 'Generate Report'}
                        </button>
                    </div>
                </div>
            </div>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center">
                        <BarChart3 className="h-8 w-8 text-blue-500" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Total Tickets</p>
                            <p className="text-2xl font-bold text-gray-900">{totalTickets}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center">
                        <PieChart className="h-8 w-8 text-green-500" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Categories</p>
                            <p className="text-2xl font-bold text-gray-900">{reportData.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center">
                        <Calendar className="h-8 w-8 text-purple-500" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Avg per Category</p>
                            <p className="text-2xl font-bold text-gray-900">{Math.round(avgTicketsPerGroup)}</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Report Table */}
            <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold">Report Data - {reportOptions.find(opt => opt.value === reportType)?.label}</h2>
                </div>
                <TableGenerator
                    data={reportData}
                    customRender={customRender}
                    hiddenColumns={[]}
                    enableActions={false}
                />
            </div>
        </div>
    );
};

export default TicketReports;