import type { TranslationKeys } from '@/lib/i18n'

function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

export interface NotificationForResolver {
  content: string
  content_vars?: Record<string, unknown> | null
}

export function resolveNotificationContent(
  notification: NotificationForResolver,
  t: TranslationKeys,
): string {
  if (notification.content_vars != null) {
    const dotIdx = notification.content.indexOf('.')
    if (dotIdx !== -1) {
      const section = notification.content.slice(0, dotIdx) as keyof TranslationKeys
      const key = notification.content.slice(dotIdx + 1)
      const sectionObj = t[section]
      if (sectionObj && typeof sectionObj === 'object') {
        const template = (sectionObj as Record<string, string>)[key]
        if (template) {
          return interpolate(template, notification.content_vars)
        }
      }
    }
  }
  return notification.content
}
