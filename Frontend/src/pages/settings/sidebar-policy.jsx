import React, { useState, useEffect } from 'react';
import axiosInstance from '@api/axiosInstance';

const SidebarPolicy = () => {
    const [sidebars, setSidebars] = useState([]);
    const [capabilities, setCapabilities] = useState([]);

    const [selectedItem, setSelectedItem] = useState(null);
    const [message, setMessage] = useState('');

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sidRes, capRes] = await Promise.all([
                    axiosInstance.get('/populate/list/sidebars?limit=100&sort={"order":1}'),
                    axiosInstance.post('/populate/read/capabilities', { filter: { status: 'active' }, limit: 1000 })
                ]);
                setSidebars((sidRes.data.data || []).map(item => ({...item, _id: item._id?.$oid || item._id})));
                setCapabilities(capRes.data.data || []);
            } catch (err) {
                console.error("Failed to load sidebar data", err);
            }
        };
        fetchData();
    }, []);

    const handleSelect = (item) => {
        setSelectedItem({ ...item }); // Clone to edit
        setMessage('');
    };



    const toggleCapability = (capId) => {
        setSelectedItem(prev => {
            const list = prev.capabilities || [];
            const exists = list.includes(capId);
            const newList = exists ? list.filter(x => x !== capId) : [...list, capId];
            return { ...prev, capabilities: newList };
        });
    };

    const handleSave = async () => {
        if (!selectedItem) return;
        setMessage('Saving...');
        try {
            await axiosInstance.put(`/populate/update/sidebars/${selectedItem._id}`, {
                allowedDepartments: [],
                allowedDesignations: [],
                capabilities: selectedItem.capabilities
            });

            // Update local list
            setSidebars(prev => prev.map(x => x._id === selectedItem._id ? selectedItem : x));
            setMessage('Saved Sidebar Config!');
        } catch (err) {
            console.error(err);
            setMessage('Error Saving');
        }
    };

    const handleRefreshCache = async () => {
        try {
            await axiosInstance.post('/config/refresh-policy');
            alert('Cache Refreshed!');
        } catch (e) {
            alert('Refresh Failed');
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow h-full flex gap-6">

            {/* List Column */}
            <div className="w-1/3 border-r pr-4 flex flex-col">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Sidebar Items</h2>
                <div className="flex-1 overflow-auto space-y-2">
                    {sidebars.map(item => (
                        <div
                            key={item._id}
                            onClick={() => handleSelect(item)}
                            className={`p-3 rounded cursor-pointer ${selectedItem?._id === item._id ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <div className="font-medium dark:text-white">{item.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.mainRoute}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Config Column */}
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">Permission Config</h2>
                    <button
                        onClick={handleRefreshCache}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                        Refresh Cache
                    </button>
                </div>

                {selectedItem ? (
                    <div className="flex-1 overflow-auto">
                        <h3 className="text-lg font-semibold mb-2 dark:text-gray-200">Editing: {selectedItem.title}</h3>



                        {/* Capabilities */}
                        <div className="mb-6">
                            <label className="block mb-2 font-medium dark:text-gray-300">Required Capabilities</label>
                            <div className="grid grid-cols-2 gap-2 p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-900 max-h-60 overflow-y-auto">
                                {capabilities.map(cap => (
                                    <label key={cap._id} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedItem.capabilities?.includes(cap._id?.$oid || cap._id)}
                                            onChange={() => toggleCapability(cap._id?.$oid || cap._id)}
                                            className="w-4 h-4 accent-blue-600"
                                        />
                                        <span className="text-sm dark:text-gray-300">{cap.label || cap.name || cap.key}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Select capabilities required to view this menu item.</p>
                        </div>

                        <div className="flex justify-end items-center gap-4 mt-8">
                            <span className="text-green-500">{message}</span>
                            <button
                                onClick={handleSave}
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700"
                            >
                                Save Permissions
                            </button>
                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a Sidebar Item to configure permissions
                    </div>
                )}
            </div>
        </div>
    );
};

export default SidebarPolicy;
