'use client'

import { useEffect, useState } from 'react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { Spinner } from './shared/Spinner'
import { btnPrimary } from './shared/utils'
import type { SystemSetting } from './shared/types'

interface Props {
  showToast: (msg: string, ok?: boolean) => void
}

export function SettingsTab({ showToast }: Props) {
  const { t } = useTranslation()

  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [autoSuspendThreshold, setAutoSuspendThreshold] = useState('10')

  async function loadSettings() {
    setSettingsLoading(true)
    try {
      const data = await fetchApi<SystemSetting[]>('/admin/settings')
      const threshold = data.find((s) => s.key === 'auto_suspend_threshold')
      if (threshold) setAutoSuspendThreshold(threshold.value)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setSettingsLoading(false)
    }
  }

  async function saveAutoSuspendThreshold() {
    const val = parseInt(autoSuspendThreshold, 10)
    if (isNaN(val) || val < 1 || val > 100) return
    setSettingsSaving(true)
    try {
      await fetchApi<unknown>('/admin/settings/auto_suspend_threshold', {
        method: 'PATCH',
        body: JSON.stringify({ value: String(val) }),
      })
      showToast(t.admin.toastSettingSaved)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setSettingsSaving(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
        {t.admin.managementSettings}
      </p>

      {settingsLoading ? (
        <div className="flex justify-center py-8"><Spinner size={6} /></div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-high p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-on-surface">{t.admin.settingsAutoSuspend}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {t.admin.settingsAutoSuspendDesc}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={100}
                value={autoSuspendThreshold}
                onChange={(e) => setAutoSuspendThreshold(e.target.value)}
                className="w-24 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[40px]"
                aria-label={t.admin.settingsAutoSuspend}
              />
              <button
                onClick={() => void saveAutoSuspendThreshold()}
                disabled={settingsSaving || !autoSuspendThreshold || Number(autoSuspendThreshold) < 1 || Number(autoSuspendThreshold) > 100}
                className={btnPrimary}
              >
                {settingsSaving && <Spinner size={4} />}
                {t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
