import { useEffect, useState } from 'react';
import { Shield, Settings2, CalendarRange, Globe, Landmark, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import FormPageLayout from '../../components/Forms/FormPageLayout';

const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'GMT', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore'
];

const CURRENCIES = [
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD'
];

export default function GeneralSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    _id: '',
    organization: { companyName: '', branding: { primaryColor: '#6366F1' } },
    localization: { timezone: 'Asia/Kolkata', currency: 'INR' },
    release: {
      web: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 },
      android: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 },
      ios: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 }
    },
    maintenance: {
      globalEnabled: false,
      webEnabled: false,
      mobileEnabled: false,
      message: 'System is currently undergoing scheduled maintenance.',
      bypassRoles: { web: [], mobile: [] },
      scheduledStart: '',
      scheduledEnd: ''
    },
    taskETA: {
      enabled: true,
      multiplier: 3
    },
    payroll: { pfCeiling: 15000, pfPercent: 12, esiThreshold: 21000, esiPercent: 0.75 },
    attendance: { workingHours: 8, lateGraceMinutes: 15 },
    cron: []
  });

  useEffect(() => {
    setLoading(true);
    axiosInstance.get('/populate/read/generalsettings')
      .then(res => {
        const list = res.data?.data || [];
        if (list.length > 0) {
          const doc = list[0];
          setSettings({
            _id: doc._id,
            organization: doc.organization || { companyName: '', branding: { primaryColor: '#6366F1' } },
            localization: doc.localization || { timezone: 'Asia/Kolkata', currency: 'INR' },
            release: doc.release || {
              web: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 },
              android: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 },
              ios: { currentVersion: '1.0.0', minimumVersion: '1.0.0', buildNumber: 1 }
            },
            maintenance: doc.maintenance || {
              globalEnabled: false,
              webEnabled: false,
              mobileEnabled: false,
              message: '',
              bypassRoles: { web: [], mobile: [] },
              scheduledStart: '',
              scheduledEnd: ''
            },
            taskETA: doc.taskETA || {
              enabled: true,
              multiplier: 3
            },
            payroll: doc.payroll || { pfCeiling: 15000, pfPercent: 12, esiThreshold: 21000, esiPercent: 0.75 },
            attendance: doc.attendance || { workingHours: 8, lateGraceMinutes: 15 },
            cron: doc.cron || []
          });
        }
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
        toast.error('Failed to load general settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = (path, value) => {
    setSettings(prev => {
      const copy = { ...prev };
      const keys = path.split('.');
      let current = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  const handleCronUpdate = (index, field, value) => {
    setSettings(prev => {
      const copy = { ...prev };
      const updatedCron = [...copy.cron];
      updatedCron[index] = { ...updatedCron[index], [field]: value };
      copy.cron = updatedCron;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (settings._id) {
        await axiosInstance.put(`/populate/update/generalsettings/${settings._id}`, settings);
        toast.success('General settings updated successfully');
      } else {
        const res = await axiosInstance.post('/populate/create/generalsettings', settings);
        toast.success('General settings initialized');
        if (res.data?.data?._id) {
          setSettings(s => ({ ...s, _id: res.data.data._id }));
        }
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(err?.response?.data?.message || 'Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPageLayout
      title="System Settings"
      subtitle="Configure organization defaults, release versions, maintenance states, and cron parameters."
      backTo="/dashboard"
    >
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-xs text-ink-muted mt-3">Loading settings configurations...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs Navigation */}
          <div className="flex gap-2 p-1 bg-surface-1 border border-hairline rounded-tracker-lg w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-tracker-md transition-all ${
                activeTab === 'general' ? 'bg-surface text-accent shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Settings2 className="h-4 w-4" />
              General Defaults
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-tracker-md transition-all ${
                activeTab === 'maintenance' ? 'bg-surface text-accent shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Shield className="h-4 w-4" />
              Maintenance & Releases
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduler')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-tracker-md transition-all ${
                activeTab === 'scheduler' ? 'bg-surface text-accent shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <CalendarRange className="h-4 w-4" />
              Cron Scheduler
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Organization Details */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                    <Globe className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Organization & Localization</p>
                      <p className="text-xs text-ink-muted">Configure branding rules and regional defaults</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Company Name</label>
                      <input
                        className="lmx-input"
                        value={settings.organization?.companyName || ''}
                        onChange={e => handleUpdate('organization.companyName', e.target.value)}
                        placeholder="e.g. Work Hub ERP"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Branding Primary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          className="h-9 w-12 rounded border border-hairline p-0.5 cursor-pointer bg-transparent"
                          value={settings.organization?.branding?.primaryColor || '#6366F1'}
                          onChange={e => handleUpdate('organization.branding.primaryColor', e.target.value)}
                        />
                        <input
                          className="lmx-input flex-1"
                          value={settings.organization?.branding?.primaryColor || '#6366F1'}
                          onChange={e => handleUpdate('organization.branding.primaryColor', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Timezone</label>
                      <select
                        className="lmx-input"
                        value={settings.localization?.timezone || 'Asia/Kolkata'}
                        onChange={e => handleUpdate('localization.timezone', e.target.value)}
                      >
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Default Currency</label>
                      <select
                        className="lmx-input"
                        value={settings.localization?.currency || 'INR'}
                        onChange={e => handleUpdate('localization.currency', e.target.value)}
                      >
                        {CURRENCIES.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Payroll Statutory Thresholds */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                    <Landmark className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Payroll Statutory Defaults</p>
                      <p className="text-xs text-ink-muted">Configure baseline PF ceilings and ESI percentages</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">PF Ceiling Limit (₹)</label>
                      <input
                        type="number"
                        className="lmx-input"
                        value={settings.payroll?.pfCeiling || 0}
                        onChange={e => handleUpdate('payroll.pfCeiling', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">PF Percentage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="lmx-input"
                        value={settings.payroll?.pfPercent || 0}
                        onChange={e => handleUpdate('payroll.pfPercent', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">ESI Threshold Limit (₹)</label>
                      <input
                        type="number"
                        className="lmx-input"
                        value={settings.payroll?.esiThreshold || 0}
                        onChange={e => handleUpdate('payroll.esiThreshold', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">ESI Percentage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="lmx-input"
                        value={settings.payroll?.esiPercent || 0}
                        onChange={e => handleUpdate('payroll.esiPercent', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Attendance & Shift Details */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                    <Clock className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Attendance & Shifts</p>
                      <p className="text-xs text-ink-muted">Configure default working hours and late grace bounds</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Daily Working Hours</label>
                      <input
                        type="number"
                        className="lmx-input"
                        value={settings.attendance?.workingHours || 8}
                        onChange={e => handleUpdate('attendance.workingHours', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Late Grace Minutes</label>
                      <input
                        type="number"
                        className="lmx-input"
                        value={settings.attendance?.lateGraceMinutes || 15}
                        onChange={e => handleUpdate('attendance.lateGraceMinutes', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {/* Task ETA Engine Settings */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                    <Clock className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Task Delivery ETA Engine</p>
                      <p className="text-xs text-ink-muted">Configure adhoc queue buffer multipliers and calculate state</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border border-hairline bg-surface-1 rounded-tracker-md">
                      <div>
                        <span className="text-xs font-bold text-ink uppercase tracking-wide block">Enable ETA Auto-Calculation</span>
                        <span className="text-[10px] text-ink-muted mt-0.5 block">Compute delivery timeline predictions based on developer queues</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.taskETA?.enabled ?? true}
                        onChange={e => handleUpdate('taskETA.enabled', e.target.checked)}
                        className="rounded border-hairline text-accent h-4 w-4"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Delivery Buffer Multiplier</label>
                      <input
                        type="number"
                        className="lmx-input"
                        value={settings.taskETA?.multiplier ?? 3}
                        onChange={e => handleUpdate('taskETA.multiplier', Number(e.target.value))}
                        min={1}
                        placeholder="e.g. 3 (Default)"
                      />
                      <span className="text-[10px] text-ink-tertiary mt-1 block">
                        Formula: Delivery Hours = Queue Hours + (Task Hours × Multiplier)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                {/* Maintenance Settings */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                    <Shield className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-ink">System Maintenance Gateway</p>
                      <p className="text-xs text-ink-muted">Toggle target client maintenance status rules</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 border border-hairline bg-surface-1 rounded-tracker-md flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink uppercase tracking-wide">Global System</span>
                        <input
                          type="checkbox"
                          checked={settings.maintenance?.globalEnabled || false}
                          onChange={e => handleUpdate('maintenance.globalEnabled', e.target.checked)}
                          className="rounded border-hairline text-accent h-4 w-4"
                        />
                      </div>
                      <p className="text-xs text-ink-muted">Puts all endpoints on strict bypass (only Super Admin)</p>
                    </div>
                    <div className="p-4 border border-hairline bg-surface-1 rounded-tracker-md flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink uppercase tracking-wide">Web Client</span>
                        <input
                          type="checkbox"
                          checked={settings.maintenance?.webEnabled || false}
                          onChange={e => handleUpdate('maintenance.webEnabled', e.target.checked)}
                          className="rounded border-hairline text-accent h-4 w-4"
                        />
                      </div>
                      <p className="text-xs text-ink-muted">Locks down web frontend traffic with custom screens</p>
                    </div>
                    <div className="p-4 border border-hairline bg-surface-1 rounded-tracker-md flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink uppercase tracking-wide">Mobile Application</span>
                        <input
                          type="checkbox"
                          checked={settings.maintenance?.mobileEnabled || false}
                          onChange={e => handleUpdate('maintenance.mobileEnabled', e.target.checked)}
                          className="rounded border-hairline text-accent h-4 w-4"
                        />
                      </div>
                      <p className="text-xs text-ink-muted">Bypasses API requests originating from iOS/Android builds</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Custom Maintenance Message</label>
                    <textarea
                      className="lmx-input resize-none"
                      rows={3}
                      value={settings.maintenance?.message || ''}
                      onChange={e => handleUpdate('maintenance.message', e.target.value)}
                      placeholder="e.g. System is currently undergoing scheduled maintenance. Please check back later."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Web Bypass Roles (Comma separated)</label>
                      <input
                        className="lmx-input"
                        value={(settings.maintenance?.bypassRoles?.web || []).join(', ')}
                        onChange={e => {
                          const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          handleUpdate('maintenance.bypassRoles.web', val);
                        }}
                        placeholder="e.g. Super Admin, Developer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Mobile Bypass Roles (Comma separated)</label>
                      <input
                        className="lmx-input"
                        value={(settings.maintenance?.bypassRoles?.mobile || []).join(', ')}
                        onChange={e => {
                          const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          handleUpdate('maintenance.bypassRoles.mobile', val);
                        }}
                        placeholder="e.g. Super Admin"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Scheduled Start Time</label>
                      <input
                        type="datetime-local"
                        className="lmx-input font-medium"
                        value={settings.maintenance?.scheduledStart ? new Date(settings.maintenance.scheduledStart).toISOString().slice(0, 16) : ''}
                        onChange={e => handleUpdate('maintenance.scheduledStart', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">Scheduled End Time (For countdown)</label>
                      <input
                        type="datetime-local"
                        className="lmx-input font-medium"
                        value={settings.maintenance?.scheduledEnd ? new Date(settings.maintenance.scheduledEnd).toISOString().slice(0, 16) : ''}
                        onChange={e => handleUpdate('maintenance.scheduledEnd', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Releases Management */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                    <RefreshCw className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Releases & Versioning</p>
                      <p className="text-xs text-ink-muted">Configure version ceilings for web, android, and iOS clients</p>
                    </div>
                  </div>
                  <div className="space-y-4 divide-y divide-hairline-soft">
                    {['web', 'android', 'ios'].map(platform => (
                      <div key={platform} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 first:pt-0">
                        <div className="flex items-center">
                          <span className="text-xs font-bold text-ink uppercase tracking-wide">{platform} Platform</span>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Current Version</label>
                          <input
                            className="lmx-input"
                            value={settings.release?.[platform]?.currentVersion || ''}
                            onChange={e => handleUpdate(`release.${platform}.currentVersion`, e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Minimum Version</label>
                          <input
                            className="lmx-input"
                            value={settings.release?.[platform]?.minimumVersion || ''}
                            onChange={e => handleUpdate(`release.${platform}.minimumVersion`, e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Build Number</label>
                          <input
                            type="number"
                            className="lmx-input"
                            value={settings.release?.[platform]?.buildNumber || 0}
                            onChange={e => handleUpdate(`release.${platform}.buildNumber`, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scheduler' && (
              <div className="space-y-6">
                {/* Cron Scheduler Setup */}
                <div className="tracker-card-plain p-6 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-hairline-soft">
                    <CalendarRange className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Background Workers (Cron Scheduler)</p>
                      <p className="text-xs text-ink-muted">Dynamically schedule database jobs and background threads</p>
                    </div>
                  </div>

                  {settings.cron.length === 0 ? (
                    <div className="py-8 text-center text-xs text-ink-subtle">
                      No cron scheduler jobs defined in settings document.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {settings.cron.map((cronItem, index) => (
                        <div key={cronItem.jobName} className="p-4 border border-hairline bg-surface rounded-tracker-md flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-accent">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-ink">{cronItem.jobName}</span>
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${cronItem.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                              <span className="text-[10px] text-ink-subtle">{cronItem.enabled ? 'Active/Scheduled' : 'Paused/Disabled'}</span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-48">
                              <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Cron Schedule Expression</label>
                              <input
                                className="lmx-input text-xs font-mono"
                                value={cronItem.cronExpression || ''}
                                onChange={e => handleCronUpdate(index, 'cronExpression', e.target.value)}
                              />
                            </div>
                            <div className="w-36">
                              <label className="block text-[10px] font-bold text-ink-subtle mb-1 uppercase">Job Timezone</label>
                              <input
                                className="lmx-input text-xs"
                                value={cronItem.timezone || ''}
                                onChange={e => handleCronUpdate(index, 'timezone', e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col items-start pt-3">
                              <label className="flex items-center gap-2 cursor-pointer mt-1">
                                <input
                                  type="checkbox"
                                  checked={cronItem.enabled || false}
                                  onChange={e => handleCronUpdate(index, 'enabled', e.target.checked)}
                                  className="rounded border-hairline text-accent h-4 w-4"
                                />
                                <span className="text-xs text-ink-muted">Enabled</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
              <button type="submit" disabled={saving} className="tracker-btn-accent">
                {saving ? 'Saving Settings...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}
    </FormPageLayout>
  );
}
