# AI 证书导入功能实施计划

## 任务概述
在专业档案荣誉页面（CertificateList.tsx）添加 AI 导入功能，支持通过上传或粘贴图片/PDF，使用 AI 自动识别并导入证书信息。

## ✅ 已完成功能

### 1. UI 部分 ✅
- [x] 在"登记新成果"按钮旁边添加"AI 导入"按钮（橙色渐变样式）
- [x] 点击后弹出 Modal，包含：
  - [x] 文件上传区域（拖拽 + 点击上传）
  - [x] 粘贴区域（支持 Ctrl+V 粘贴图片）
  - [x] AI Provider 选择器（Gemini + 自定义 provider）
  - [x] 开始识别按钮
  - [x] 导入结果预览区域（带颜色标签）
  - [x] 确认导入按钮

### 2. AI 调用 ✅
- [x] 使用 `certificate` 类别的 prompt 模板
- [x] 支持 Gemini 和自定义 OpenAI 兼容 provider
- [x] 返回符合 Certificate 接口的 JSON 数组

### 3. 数据处理 ✅
- [x] 解析 AI 返回的 JSON
- [x] 自动转换 level 和 category 枚举值
- [x] 显示预览供用户确认
- [x] 批量添加到数据库

### 4. 系统设置增强 ✅
- [x] AI Provider 配置支持文件上传导入
- [x] AI Provider 配置支持剪贴板粘贴导入

## Certificate 接口
```typescript
interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  level: HonorLevel;
  category: CertificateCategory;
  credentialUrl?: string;
  hours?: number;
  timestamp: number;
}
```

## AI 返回格式
```json
[
  {
    "name": "证书名称",
    "issuer": "颁发单位",
    "issueDate": "2024-01-15",
    "level": "省级",
    "category": "荣誉表彰",
    "hours": 0
  }
]
```

## 使用说明

### AI 导入证书
1. 点击"AI 导入"按钮打开 Modal
2. 选择 AI 引擎（默认 Gemini，或选择自定义 provider）
3. 上传证书图片/PDF，或直接 Ctrl+V 粘贴
4. 点击"开始识别"
5. 预览识别结果，确认无误后点击"确认导入"

### 导入 AI Provider 配置
1. 进入"系统设置 → AI 模型配置"
2. 点击"上传配置"选择 JSON 文件，或点击"粘贴导入"从剪贴板导入
3. JSON 格式示例：
```json
[
  {
    "name": "My Provider",
    "baseUrl": "https://api.example.com/v1",
    "apiKey": "sk-xxx",
    "modelId": "gpt-4o"
  }
]
```

## 文件修改列表
- `views/CertificateList.tsx` - 添加 AI 导入功能
- `views/SystemSettings.tsx` - 添加粘贴导入 provider 功能
