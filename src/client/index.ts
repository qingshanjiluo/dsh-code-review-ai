import React from 'react';

const NS = 'code-review-ai';

const zh = {
  title: 'AI 代码审查',
  description: '使用 AI 检测代码问题、风格缺陷和潜在 Bug',
  enabled: '启用插件',
  severity: '严重级别',
  severityError: '错误',
  severityWarning: '警告',
  severityInfo: '信息',
};

const en = {
  title: 'AI Code Review',
  description: 'Use AI to detect code issues, style defects, and potential bugs',
  enabled: 'Enable plugin',
  severity: 'Severity Level',
  severityError: 'Error',
  severityWarning: 'Warning',
  severityInfo: 'Info',
};

export const inject = ['settingsScope', 'slots', 'locale'];

export function apply(ctx: any) {
  ctx.effect?.(() => ctx.locale?.register?.(NS, { zh, en }), `dsh-${NS}: locale`);
  ctx.effect?.(() => {
    ctx.slots?.inject?.('settings.plugin.item', function* () {
      yield ctx.slots.register({ name: 'settings.plugin.item', key: NS, locale: NS, inject: () => ({}) }, Card);
    });
  }, `dsh-${NS}: settings`);
}

function Card(props: any) {
  const { scope, t } = props;
  const [open, setOpen] = React.useState(false);
  const s = { background: '#1a1a2e', color: '#e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid #333' } as React.CSSProperties;
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.15s' } as React.CSSProperties;
  const label = { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', marginBottom: '6px' } as React.CSSProperties;

  return React.createElement('li', { className: `dsh-${NS}-card`, style: s },
    React.createElement('div', { style: row, onClick: () => setOpen(!open), onMouseEnter: (e: any) => e.currentTarget.style.background = '#252540', onMouseLeave: (e: any) => e.currentTarget.style.background = 'transparent' },
      React.createElement('div', null,
        React.createElement('strong', { style: { fontSize: '14px' } }, '\uD83D\uDD0D ', t('title')),
        React.createElement('p', { style: { margin: '2px 0 0', fontSize: '12px', color: '#888' } }, t('description')),
      ),
      React.createElement('span', { style: { fontSize: '12px', color: '#888' } }, open ? '\u25B2' : '\u25BC'),
    ),
    open ? React.createElement('div', { style: { padding: '8px 0', borderTop: '1px solid #333' } },
      React.createElement('label', { style: label },
        React.createElement('input', { type: 'checkbox', checked: scope?.get?.('enabled') ?? true, onChange: (e: any) => scope?.set?.('enabled', e.target.checked) }),
        t('enabled'),
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        React.createElement('label', { style: { fontSize: '13px', minWidth: '100px' } }, t('severity')),
        React.createElement('select', { value: scope?.get?.('severity') ?? 'warning', onChange: (e: any) => scope?.set?.('severity', e.target.value), style: { padding: '4px 8px', borderRadius: '4px', border: '1px solid #444', background: '#0d0d1a', color: '#e0e0e0', fontSize: '13px', cursor: 'pointer' } },
          React.createElement('option', { value: 'error' }, t('severityError')),
          React.createElement('option', { value: 'warning' }, t('severityWarning')),
          React.createElement('option', { value: 'info' }, t('severityInfo')),
        ),
      ),
    ) : null,
  );
}
