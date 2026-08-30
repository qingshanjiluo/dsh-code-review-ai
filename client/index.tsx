import React from 'react';
import { createSettingsCard } from '@deepseek-ai/dsh-settings';

export default createSettingsCard({
  title: 'code-review-ai',
  description: 'AI 代码审查',
  config: [
    { key: 'enabled', type: 'boolean', label: '启用插件', default: true },
    { key: 'language', type: 'string', label: '编程语言', default: 'auto' },
    { key: 'severity', type: 'select', label: '最低严重级别', options: ['error', 'warning', 'info'], default: 'warning' },
    { key: 'maxFileSize', type: 'number', label: '最大文件大小(bytes)', default: 102400 },
  ],
});
