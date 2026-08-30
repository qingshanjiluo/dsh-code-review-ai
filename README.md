# dsh-code-review-ai

> DeepSeek Harness AI 代码审查插件

## 功能

- 🔒 **安全检测**: SQL 注入、XSS、硬编码密钥、eval 使用、路径遍历、命令注入
- ⚡ **性能分析**: N+1 查询、大循环、同步 IO、内存泄漏
- 🎨 **风格检查**: TODO/FIXME、console.log、魔法数字、深嵌套、长函数
- ✅ **最佳实践**: 缺少错误处理、缺少类型、命名不一致、缺少文档
- 📊 **健康评分**: 0-100 综合评分

## 工具

| 工具名 | 说明 |
|--------|------|
| `review_file` | 审查单个文件 |
| `review_directory` | 审查目录所有文件 |
| `review_diff` | 审查 git diff |

## 命令

- `/review [path]` — 审查代码

## License

MIT
