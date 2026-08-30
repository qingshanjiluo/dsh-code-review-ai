export const inject = ['settingsScope', 'slots', 'locale'] as const;

const zh = {
  title: 'AI 代码审查',
  enabled: '启用代码审查',
  severity: '严重级别',
  severityError: '错误',
  severityWarning: '警告',
  severityInfo: '信息',
};

const en = {
  title: 'AI Code Review',
  enabled: 'Enable Code Review',
  severity: 'Severity Level',
  severityError: 'Error',
  severityWarning: 'Warning',
  severityInfo: 'Info',
};

function ReviewCard({ settingsScope, locale }: { settingsScope: any; locale: any }) {
  const t = locale.lang === 'zh' ? zh : en;

  return {
    type: 'card' as const,
    title: t.title,
    children: [
      {
        type: 'row' as const,
        label: t.enabled,
        control: {
          type: 'toggle' as const,
          value: settingsScope.get('dsh-code-review-ai.enabled', true),
          onChange: (v: boolean) => settingsScope.set('dsh-code-review-ai.enabled', v),
        },
      },
      {
        type: 'row' as const,
        label: t.severity,
        control: {
          type: 'select' as const,
          value: settingsScope.get('dsh-code-review-ai.severity', 'warning'),
          options: [
            { value: 'error', label: t.severityError },
            { value: 'warning', label: t.severityWarning },
            { value: 'info', label: t.severityInfo },
          ],
          onChange: (v: string) => settingsScope.set('dsh-code-review-ai.severity', v),
        },
      },
    ],
  };
}

export function apply(ctx: any) {
  ctx.locale.register('dsh-code-review-ai', { zh, en });

  ctx.slots.register('settings', () => {
    return ReviewCard({
      settingsScope: ctx.settingsScope,
      locale: ctx.locale,
    });
  });
}
