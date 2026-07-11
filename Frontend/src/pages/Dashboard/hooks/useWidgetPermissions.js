import { useState, useEffect } from 'react';
import axiosInstance from '../../../api/axiosInstance';
import { useAuth } from '../../../context/authProvider';

/**
 * Fetches the enabled widget IDs for the current user's role.
 *
 * Uses the standard populate engine:
 *   POST /populate/read/dashboardwidgets  { filter: { role: <roleId> } }
 *
 * Returns:
 *   widgets   — Set<string> of enabled widget IDs
 *   can(id)   — helper: true if widgetId is in the set
 *   loading   — boolean
 *   hasConfig — true when the role has a saved widget document in the DB
 */
export function useWidgetPermissions(roleId) {
  const { user } = useAuth();
  const resolvedRoleId = roleId || user?.role;

  const [widgets, setWidgets] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    if (!resolvedRoleId) {
      setLoading(false);
      return;
    }

    const fetchWidgets = async () => {
      setLoading(true);
      try {
        // Standard populate-engine read payload
        const res = await axiosInstance.post('/populate/read/dashboardwidgets', {
          filter: { role: resolvedRoleId },
          limit: 1,
        });

        const doc = res.data?.data?.[0];
        const ids = doc?.widgets || [];

        setWidgets(new Set(ids));
        // hasConfig = a document exists for this role (even if widgets list is empty)
        setHasConfig(!!doc);
      } catch (err) {
        console.error('useWidgetPermissions fetch error:', err);
        setWidgets(new Set());
        setHasConfig(false);
      } finally {
        setLoading(false);
      }
    };

    fetchWidgets();
  }, [resolvedRoleId]);

  /** true if widgetId is enabled for this role */
  const can = (widgetId) => widgets.has(widgetId);

  return { widgets, can, loading, hasConfig };
}
