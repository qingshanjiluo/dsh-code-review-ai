# dsh-code-review-ai

> DeepSeek Harness AI 代码审查

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 功能特性

- 🔒 **安全检测**: SQL 注入、XSS、硬编码密钥、eval 使用、路径遍历、命令注入
- ⚡ **性能分析**: N+1 查询、大循环、同步 IO、内存泄漏
- 🎨 **风格检查**: TODO/FIXME、console.log、魔法数字、深嵌套、长函数
- ✅ **最佳实践**: 缺少错误处理、缺少类型、命名不一致、缺少文档
- 📊 **健康评分**: 0-100 综合评分

## 📦 安装

```bash
npm install dsh-code-review-ai
```

## 🛠️ 工具

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `review_file` | 审查单个文件 | `file` |
| `review_directory` | 审查目录所有文件 | `path`, `pattern` |
| `review_diff` | 审查 git diff | `diff` |

## 📋 命令

- `/review [path]` — 审查代码

## ⚙️ 配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enabled` | boolean | `true` | 启用插件 |
| `language` | string | `auto` | 编程语言 |
| `severity` | string | `warning` | 最低严重级别 |
| `maxFileSize` | number | `102400` | 最大文件大小(bytes) |

## 📄 License

MIT
