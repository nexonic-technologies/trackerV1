import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import {
    ShieldCheckIcon,
    UserGroupIcon,
    BriefcaseIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    InformationCircleIcon,
    CheckIcon,
    PlusIcon,
    ArrowPathIcon,
    XMarkIcon
} from '@heroicons/react/24/solid';
import { usePermission } from '../../context/permissionProvider';

// Helper to clean ObjectId strings
const getCleanId = (id) => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id._id) return getCleanId(id._id);
    return id.toString();
};

export default function DesignationPermissions() {
    const { refresh: refreshPermissions } = usePermission();
    
    // UI state
    const [granteeType, setGranteeType] = useState('role');
    const [roles, setRoles] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedDesignation, setSelectedDesignation] = useState('');
    
    // Hierarchical sidebar tree structure
    const [menuTree, setMenuTree] = useState([]);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    
    const [capabilities, setCapabilities] = useState([]); // List of active capabilities from DB
    const [stagedCapabilities, setStagedCapabilities] = useState(new Set()); // Staged allowed capability keys
    
    const [loading, setLoading] = useState(false);
    const [savingState, setSavingState] = useState(''); // '', 'saving', 'saved', 'error'
    const [errorMessage, setErrorMessage] = useState('');

    // Fetch initial setup data (roles, designations, active capabilities, sidebars)
    useEffect(() => {
        const fetchSetupData = async () => {
            try {
                const [rolesRes, designationsRes, sidebarRes, capRes] = await Promise.all([
                    axiosInstance.post('/populate/read/roles'),
                    axiosInstance.post('/populate/read/designations'),
                    axiosInstance.post('/populate/read/sidebars', { 
                        filter: { isDeleted: { $ne: true } }, 
                        limit: 200,
                        populate: ['capabilities']
                    }),
                    axiosInstance.post('/populate/read/capabilities', { filter: { status: 'active' }, limit: 1000 })
                ]);
                
                const rolesData = (rolesRes.data?.data || []).map(r => ({ ...r, _id: getCleanId(r._id) }));
                const designationsData = (designationsRes.data?.data || []).map(d => ({ ...d, _id: getCleanId(d._id) }));
                const capsData = capRes.data?.data || [];

                setRoles(rolesData);
                if (rolesData.length > 0) {
                    setSelectedRole(rolesData[0]._id);
                }
                setDesignations(designationsData);
                setCapabilities(capsData);
                
                // Process sidebars into parent-child tree
                const rawSidebars = (sidebarRes.data?.data || []).map(item => ({
                    ...item,
                    _id: getCleanId(item._id),
                    parentId: item.parentId ? getCleanId(item.parentId) : null
                }));

                const parents = rawSidebars.filter(s => s.isParent || !s.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
                const children = rawSidebars.filter(s => s.parentId);

                const tree = parents.map(parent => {
                    const nodeChildren = children
                        .filter(c => c.parentId === parent._id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    return {
                        ...parent,
                        children: nodeChildren
                    };
                });
                
                setMenuTree(tree);
                
                // Expand all parent nodes by default
                const defaultExpanded = new Set(parents.map(p => p._id));
                setExpandedNodes(defaultExpanded);
            } catch (err) {
                console.error('Failed to load capabilities setup data', err);
                setErrorMessage('Failed to load menu list and capabilities structure.');
            }
        };
        fetchSetupData();
    }, []);

    // Load existing role capabilities when selection changes
    useEffect(() => {
        const fetchRoleCapabilities = async () => {
            const hasRole = granteeType === 'role' || granteeType === 'designation_role';
            
            if (hasRole && !selectedRole) {
                setStagedCapabilities(new Set());
                return;
            }

            setLoading(true);
            setSavingState('');
            setErrorMessage('');
            
            try {
                const res = await axiosInstance.post('/populate/read/roles', {
                    filter: { _id: selectedRole },
                    limit: 1
                });
                const role = res.data?.data?.[0];
                
                if (role && role.capabilities) {
                    // Fetch capability documents to get keys
                    const capIds = role.capabilities.map(c => getCleanId(c));
                    const capsRes = await axiosInstance.post('/populate/read/capabilities', {
                        filter: { _id: { $in: capIds } },
                        limit: 1000
                    });
                    const caps = capsRes.data?.data || [];
                    
                    const allowed = new Set();
                    caps.forEach(c => allowed.add(c.key));
                    setStagedCapabilities(allowed);
                } else {
                    setStagedCapabilities(new Set());
                }
            } catch (err) {
                console.error('Failed to fetch role capabilities', err);
                setErrorMessage('Error fetching capabilities settings.');
            } finally {
                setLoading(false);
            }
        };
        fetchRoleCapabilities();
    }, [granteeType, selectedRole, selectedDesignation]);

    // Save changes automatically in background
    const handleSaveCapability = async (item, newLevel, customKeyToToggle = null) => {
        setSavingState('saving');
        setErrorMessage('');

        try {
            // Calculate new desired keys
            const nextStaged = new Set(stagedCapabilities);

            if (customKeyToToggle) {
                // Toggle a specific capability key
                if (stagedCapabilities.has(customKeyToToggle)) {
                    nextStaged.delete(customKeyToToggle);
                } else {
                    nextStaged.add(customKeyToToggle);
                }
            }

            // Optimistic UI state update
            setStagedCapabilities(nextStaged);

            // Update Role.capabilities array directly
            // Convert capability keys to Capability ObjectIds
            const allCapabilityDocs = await axiosInstance.post('/populate/read/capabilities', {
                filter: { key: { $in: Array.from(nextStaged) } },
                limit: 1000
            });
            const capabilityDocs = allCapabilityDocs.data?.data || [];
            const capabilityIds = capabilityDocs.map(c => getCleanId(c._id));

            await axiosInstance.post(`/populate/update/roles/${selectedRole}`, {
                capabilities: capabilityIds
            });

            setSavingState('saved');
            await refreshPermissions();
        } catch (err) {
            console.error('Auto-save failed:', err);
            setErrorMessage('Auto-save failed. Some capability updates might not have saved.');
            setSavingState('error');
        }
    };

    const toggleNodeExpanded = (nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const isSelectionComplete = () => {
        if (granteeType === 'role') return !!selectedRole;
        if (granteeType === 'designation') return !!selectedDesignation;
        return !!selectedRole && !!selectedDesignation;
    };

    // Render a row in the menu tree
    const renderMenuRow = (item, isChild = false) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedNodes.has(item._id);

        // Use sidebar's capabilities directly instead of generating keys
        const sidebarCapabilities = item.capabilities || [];
        const sidebarCapKeys = sidebarCapabilities.map(c => c.key);

        // Identify custom actions (e.g. approve, reject) from the sidebar's capabilities
        const customCaps = sidebarCapabilities.filter(c => {
            const action = c.action;
            return action && !['view', 'create', 'read', 'update', 'delete'].includes(action);
        });

        const permitsEdit = sidebarCapKeys.some(key => stagedCapabilities.has(key));

        return (
            <div key={item._id} className="w-full">
                {/* Node row */}
                <div className={`
                    flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 border-b border-hairline-soft transition-colors
                    ${isChild ? 'bg-surface/20 pl-10' : 'bg-surface/60 font-semibold'}
                    hover:bg-accent-light/30
                `}>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Collapse chevron for parent */}
                        {!isChild && hasChildren ? (
                            <button
                                type="button"
                                onClick={() => toggleNodeExpanded(item._id)}
                                className="p-1 rounded hover:bg-canvas text-ink-subtle hover:text-ink transition-colors"
                                style={{ minWidth: '24px', minHeight: '24px' }}
                            >
                                {isExpanded ? (
                                    <ChevronDownIcon className="w-4 h-4" />
                                ) : (
                                    <ChevronRightIcon className="w-4 h-4" />
                                )}
                            </button>
                        ) : !isChild ? (
                            <div className="w-6" /> // spacer
                        ) : null}

                        {/* Indent spacer for children */}
                        {isChild && (
                            <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle/40 flex-shrink-0" />
                        )}

                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-ink truncate">{item.title}</span>
                        </div>
                    </div>

                    {/* Inline controls */}
                    <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-center">
                        {sidebarCapKeys.length > 0 ? (
                            <div className="flex items-center gap-3">
                                {/* Show sidebar capabilities as checkboxes */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {sidebarCapabilities.map(cap => {
                                        const isChecked = stagedCapabilities.has(cap.key);
                                        return (
                                            <button
                                                key={cap.key}
                                                type="button"
                                                onClick={() => handleSaveCapability(item, null, cap.key)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 border transition-all ${
                                                    isChecked
                                                        ? 'bg-accent/10 border-accent/30 text-accent'
                                                        : 'bg-surface border-hairline text-ink-muted hover:border-hairline'
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                                    isChecked ? 'bg-accent border-transparent text-white' : 'border-hairline bg-canvas'
                                                }`}>
                                                    {isChecked && <CheckIcon className="w-3 h-3" />}
                                                </div>
                                                <span>{cap.label || cap.key}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <span className="text-xs text-ink-muted font-medium pr-12">No capabilities defined</span>
                        )}
                    </div>
                </div>

                {/* Inline custom capabilities if edit allowed */}
                {permitsEdit && customCaps.length > 0 && (
                    <div className={`py-2 border-b border-hairline-soft bg-canvas/30 ${isChild ? 'pl-16 pr-4' : 'pl-12 pr-4'}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mr-2">Additional:</span>
                            {customCaps.map(cap => {
                                const isChecked = stagedCapabilities.has(cap.key);
                                const actionName = cap.action;
                                return (
                                    <button
                                        key={cap.key}
                                        type="button"
                                        onClick={() => handleSaveCapability(item, null, cap.key)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                                            isChecked
                                                ? 'bg-accent/10 border-accent/30 text-accent'
                                                : 'bg-surface border-hairline text-ink-muted hover:border-hairline'
                                        }`}
                                        style={{ minWidth: '40px', minHeight: '32px' }}
                                    >
                                        <div className={`w-3 h-3 rounded flex items-center justify-center border transition-all ${
                                            isChecked ? 'bg-accent border-transparent text-white' : 'border-hairline bg-canvas'
                                        }`}>
                                            {isChecked && <CheckIcon className="w-2 h-2" />}
                                        </div>
                                        <span className="capitalize">{actionName}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Render children if expanded */}
                {hasChildren && isExpanded && (
                    <div className="w-full flex flex-col">
                        {item.children.map(child => renderMenuRow(child, true))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="lmx-content" data-module="hr">
            {/* Header section with real-time status indicators */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-hairline-soft pb-4">
                <div>
                    <span className="lmx-page-eyebrow text-accent uppercase tracking-[0.2em]">Settings & Security</span>
                    <h1 className="text-2xl font-black text-ink tracking-tight mt-1 flex items-center gap-2">
                        <ShieldCheckIcon className="w-7 h-7 text-accent" />
                        Permissions
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 flex-shrink-0 self-end sm:self-center">
                    {/* Compact Select Role */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Role:</span>
                        <div className="relative w-48">
                            <select
                                value={selectedRole}
                                onChange={(e) => { setSelectedRole(e.target.value); setSavingState(''); }}
                                className="lmx-input w-full py-2 pl-3 pr-8 text-xs font-bold text-ink bg-canvas border border-hairline focus:border-accent focus:ring-4 focus:ring-accent/15 rounded-lg appearance-none transition-all"
                            >
                                <option value="">— Choose Role —</option>
                                {roles.map(r => (
                                    <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Instant status indicators */}
                    <div className="flex items-center gap-2">
                        {savingState === 'saving' && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-light/50 text-accent text-xs font-bold shadow-sm animate-pulse border border-accent/20">
                                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                <span>Auto-saving...</span>
                            </div>
                        )}
                        {savingState === 'saved' && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm transition-all duration-300">
                                <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                <span>All changes saved</span>
                            </div>
                        )}
                        {savingState === 'error' && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-250 dark:border-rose-800/40 shadow-sm">
                                <XMarkIcon className="w-4 h-4 text-rose-500" />
                                <span>Error auto-saving</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tree Table Editor */}
            {!isSelectionComplete() ? (
                <div className="tracker-card-plain py-16 flex flex-col items-center justify-center text-center bg-surface/30 border border-dashed border-hairline-soft rounded-xl shadow-sm">
                    <ShieldCheckIcon className="w-12 h-12 text-ink-muted/30 mb-3" />
                    <p className="text-base font-bold text-ink-muted">Select role or designation above to begin configuration</p>
                    <p className="text-xs text-ink-muted mt-1 max-w-sm">Configure permissions dynamically by choosing a role or designation from the header select boxes.</p>
                </div>
            ) : loading ? (
                <div className="tracker-card-plain py-20 flex flex-col items-center justify-center bg-surface/30 border border-hairline-soft rounded-xl shadow-sm">
                    <ArrowPathIcon className="w-8 h-8 text-accent animate-spin mb-3" />
                    <p className="text-sm font-bold text-ink-muted">Loading capability settings...</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Error Alerts */}
                    {errorMessage && (
                        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-800/40 rounded-xl text-rose-700 dark:text-rose-350 shadow-sm">
                            <XMarkIcon className="w-5 h-5 flex-shrink-0 text-rose-500" />
                            <p className="text-xs font-semibold">{errorMessage}</p>
                        </div>
                    )}

                    {/* Quick description & tip */}
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-canvas border border-hairline-soft text-ink-muted text-xs leading-relaxed">
                        <InformationCircleIcon className="w-4.5 h-4.5 text-accent flex-shrink-0" />
                        <span>
                            Permissions are saved <strong>instantly in the background</strong> when clicked. Changes invalidate active user sessions, prompting a cache refresh automatically.
                        </span>
                    </div>

                    {/* Tree Table Container */}
                    <div className="tracker-card-plain p-0 overflow-hidden bg-surface border border-hairline-soft rounded-xl shadow-sm">
                        {/* Table Header */}
                        <div className="flex justify-between items-center bg-canvas border-b border-hairline-soft py-2 px-4">
                            <span className="text-[10px] font-black uppercase tracking-wider text-ink-muted">Menu Layout & Resources</span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-ink-muted pr-12">Access Control Levels</span>
                        </div>

                        {/* Table Body */}
                        <div className="flex flex-col w-full divide-y divide-hairline-soft">
                            {menuTree.length === 0 ? (
                                <div className="py-12 text-center text-ink-muted text-sm">No sidebar menu items found</div>
                            ) : (
                                menuTree.map(parent => renderMenuRow(parent))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline custom icon components to keep layout dependency-free and robust
function CheckCircleIcon({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.748-5.25Z" clipRule="evenodd" />
        </svg>
    );
}
