# SU3PT 可编辑PPTX导出功能 - 集成说明

## 📋 功能概述

本模块为 SU3PT 智能演示文稿工具提供了完整的可编辑PPTX导出功能，支持将网页端演示文稿导出为原生可编辑的PPTX格式文件。

## 🚀 快速开始

### 1. 引入模块

在HTML文件中引入 `pptx-exporter.js`：

```html
<script src="pptx-exporter.js"></script>
```

### 2. 添加导出按钮

```html
<button onclick="exportPPTX()">导出可编辑PPTX</button>
```

### 3. 调用导出方法

```javascript
async function exportPPTX() {
    const result = await window.pptManager.generateEditablePPTX();
    if (result.success) {
        console.log('导出成功:', result.fileName);
    } else {
        console.error('导出失败:', result.error);
    }
}
```

## 📦 核心功能

### 1. 元素映射规则

#### 基础元素

| 网页元素 | PPTX元素 | 可编辑属性 |
|---------|---------|-----------|
| text | 文本框 | 文本内容、字体、颜色、大小、对齐 |
| image | 原生图片 | 替换图片、调整大小/位置 |
| chart | 原生图表 | 数据源、坐标轴、图例 |

#### 自定义元素

| 网页元素 | PPTX实现 | 可编辑属性 |
|---------|---------|-----------|
| gradient-panel | 矩形（渐变填充）+ 文本框 | 文本、渐变颜色 |
| progress-ring | 圆形（背景环+进度环）+ 文本框 | 进度百分比、颜色 |
| tech-stack | 多个矩形（技术项背景）+ 文本框 | 技术名称、背景色 |
| gradient-card | 矩形（渐变填充）+ 文本框 | 文本、渐变颜色 |
| list | 文本框 | 列表项文本 |
| gradient-decorator | 矩形（渐变填充） | 颜色、大小 |

### 2. 技术细节处理

#### 单位转换
- 网页 px → PPTX 英寸
- 转换公式：`英寸 = 像素 / 96`
- 提供 `pxToInch(px)` 辅助函数

#### 样式适配
- 小众字体 → 微软雅黑/Arial
- 复杂渐变 → 线性渐变
- 圆角 → 普通矩形（降级处理）

#### 跨域图片
- 自动下载图片转为 Base64
- 避免跨域加载失败
- 支持 data URL 直接使用

#### 层级适配
- 网页 zIndex → PPTX 元素图层顺序
- 按 zIndex 升序排列元素

#### 旋转适配
- 元素 rotation 限制在 0-360°
- 映射为 PPTX 元素旋转角度

### 3. 容错与稳定性

#### 未知元素类型
- 自动回退为文本元素
- 不中断生成流程

#### 单元素生成失败
- 记录日志
- 继续处理下一个元素

#### 样式不兼容
- 提示用户并降级处理
- 如圆角→普通矩形

#### 空内容处理
- 生成占位符
- 不跳过元素

## 🔧 API 文档

### PPTXExporter 对象

#### 方法

##### `loadLibrary()`
动态加载 PptxGenJS 库

**返回值:** `Promise<void>`

##### `generate(presentationData)`
生成 PPTX 文件

**参数:**
- `presentationData` (Object): 演示文稿数据
  - `slides` (Array): 幻灯片数组
    - `title` (String): 幻灯片标题
    - `backgroundColor` (String): 背景色
    - `backgroundImage` (String): 背景图URL
    - `elements` (Array): 元素数组

**返回值:** `Promise<Object>`
- `success` (Boolean): 是否成功
- `fileName` (String): 文件名（成功时）
- `error` (String): 错误信息（失败时）

##### `processElement(slide, element)`
处理单个元素

**参数:**
- `slide` (Object): PPTX 幻灯片对象
- `element` (Object): 元素数据

**返回值:** `Promise<void>`

##### `processSlide(slideData)`
处理单个幻灯片

**参数:**
- `slideData` (Object): 幻灯片数据

**返回值:** `Promise<void>`

#### 辅助函数

##### `pxToInch(px)`
像素转英寸

**参数:**
- `px` (Number): 像素值

**返回值:** `Number` - 英寸值

##### `parseColor(color)`
解析颜色值

**参数:**
- `color` (String): 颜色值（HEX/RGB/RGBA/颜色名）

**返回值:** `String` - HEX 颜色值（6位）

##### `imageToBase64(url)`
图片转 Base64

**参数:**
- `url` (String): 图片URL

**返回值:** `Promise<String>` - Base64 数据

##### `parseFontSize(fontSize)`
解析字体大小

**参数:**
- `fontSize` (String): 字体大小（如 "18px"）

**返回值:** `Number` - 字体大小（10-72）

##### `parseFontWeight(fontWeight)`
解析字体粗细

**参数:**
- `fontWeight` (String): 字体粗细（如 "bold"、"700"）

**返回值:** `String` - "bold" 或 "normal"

##### `parseTextAlign(textAlign)`
解析文本对齐

**参数:**
- `textAlign` (String): 对齐方式（left/center/right/justify）

**返回值:** `String` - PPTX 对齐方式

##### `normalizeRotation(rotation)`
标准化旋转角度

**参数:**
- `rotation` (Number/String): 旋转角度

**返回值:** `Number` - 0-360° 的角度值

##### `stripHtmlTags(html)`
去除 HTML 标签

**参数:**
- `html` (String): HTML 字符串

**返回值:** `String` - 纯文本

##### `extractTextFromHtml(html)`
从 HTML 提取标题和正文

**参数:**
- `html` (String): HTML 字符串

**返回值:** `Object`
- `title` (String): 标题文本
- `body` (String): 正文文本

## 📝 使用示例

### 示例 1: 基本使用

```javascript
// 调用导出方法
const result = await window.pptManager.generateEditablePPTX();
if (result.success) {
    alert('导出成功: ' + result.fileName);
} else {
    alert('导出失败: ' + result.error);
}
```

### 示例 2: 直接使用 PPTXExporter

```javascript
const presentationData = {
    slides: [
        {
            title: "标题页",
            backgroundColor: "#ffffff",
            elements: [
                {
                    type: "text",
                    content: {
                        title: "欢迎使用",
                        body: "这是一个示例"
                    },
                    style: {
                        color: "#2d3748",
                        fontSize: "24px",
                        textAlign: "center"
                    },
                    position: { x: 100, y: 100 },
                    size: { width: 600, height: 100 },
                    zIndex: 1
                }
            ]
        }
    ]
};

const result = await window.PPTXExporter.generate(presentationData);
```

### 示例 3: 添加导出按钮

```html
<button id="exportBtn" onclick="handleExport()">导出PPTX</button>

<script>
async function handleExport() {
    const btn = document.getElementById('exportBtn');
    btn.disabled = true;
    btn.textContent = '正在导出...';
    
    try {
        const result = await window.pptManager.generateEditablePPTX();
        if (result.success) {
            alert('导出成功！');
        } else {
            alert('导出失败: ' + result.error);
        }
    } catch (error) {
        alert('导出错误: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '导出PPTX';
    }
}
</script>
```

## 🎨 元素数据结构

### 文本元素

```javascript
{
    type: "text",
    content: {
        title: "标题文本",
        body: "正文文本"
    },
    style: {
        color: "#2d3748",
        fontSize: "24px",
        fontWeight: "bold",
        textAlign: "center",
        fontFamily: "Microsoft YaHei",
        fontStyle: "italic"
    },
    position: { x: 100, y: 100 },
    size: { width: 600, height: 100 },
    rotation: 0,
    zIndex: 1
}
```

### 图片元素

```javascript
{
    type: "image",
    content: {
        url: "https://example.com/image.png",
        caption: "图片说明"
    },
    style: {
        borderRadius: "16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
    },
    position: { x: 100, y: 100 },
    size: { width: 400, height: 300 },
    rotation: 0,
    zIndex: 1
}
```

### 图表元素

```javascript
{
    type: "chart",
    content: {
        type: "bar",
        categories: ["一月", "二月", "三月"],
        series: [
            {
                name: "销售额",
                data: [100, 150, 200]
            }
        ]
    },
    position: { x: 100, y: 100 },
    size: { width: 600, height: 400 },
    rotation: 0,
    zIndex: 1
}
```

### 渐变面板元素

```javascript
{
    type: "gradient-card",
    content: {
        color1: "#4F46E5",
        color2: "#3B82F6",
        content: "<h4>标题</h4><p>内容</p>"
    },
    style: {
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.1)"
    },
    position: { x: 100, y: 100 },
    size: { width: 400, height: 200 },
    rotation: 0,
    zIndex: 1
}
```

### 进度环元素

```javascript
{
    type: "progress-ring",
    content: {
        progress: 0.75,
        color: "#10B981",
        text: "完成度"
    },
    position: { x: 100, y: 100 },
    size: { width: 200, height: 200 },
    rotation: 0,
    zIndex: 1
}
```

### 技术栈元素

```javascript
{
    type: "tech-stack",
    content: {
        items: ["React", "Vue", "Angular", "Node.js"],
        itemColor: "#4F46E5"
    },
    position: { x: 100, y: 100 },
    size: { width: 600, height: 100 },
    rotation: 0,
    zIndex: 1
}
```

## 🔍 日志系统

模块内置日志系统，可在浏览器控制台查看详细日志：

```javascript
// 日志级别
PPTXExporter.log('info', '信息消息', data);
PPTXExporter.log('warn', '警告消息', data);
PPTXExporter.log('error', '错误消息', data);
```

日志格式：
```
[PPTX导出 INFO] 信息消息 { data }
[PPTX导出 WARN] 警告消息 { data }
[PPTX导出 ERROR] 错误消息 { data }
```

## ⚠️ 注意事项

1. **库依赖**: 需要网络连接加载 PptxGenJS CDN
2. **图片跨域**: 跨域图片会自动转换为 Base64，但可能失败
3. **字体兼容**: 小众字体会降级为微软雅黑
4. **样式限制**: PPTX 不支持部分 CSS 样式，会自动降级
5. **文件大小**: 包含大量图片的演示文稿可能较大

## 🐛 故障排除

### 问题 1: 库加载失败
**症状**: 控制台显示 "PptxGenJS 库加载失败"

**解决方案**:
- 检查网络连接
- 确认 CDN 可访问
- 考虑使用本地 PptxGenJS 文件

### 问题 2: 图片无法加载
**症状**: 图片显示为占位符

**解决方案**:
- 确认图片 URL 可访问
- 检查 CORS 配置
- 使用 Base64 格式图片

### 问题 3: 样式不正确
**症状**: 导出的 PPTX 样式与网页不一致

**解决方案**:
- PPTX 样式有限，部分效果会降级
- 使用标准颜色格式（HEX）
- 避免使用复杂渐变和阴影

### 问题 4: 导出失败
**症状**: 点击导出按钮无反应或报错

**解决方案**:
- 检查浏览器控制台日志
- 确认演示文稿数据格式正确
- 检查元素数据完整性

## 📊 性能优化

1. **图片优化**: 使用适当大小的图片，避免过大文件
2. **元素数量**: 单页元素数量建议不超过 50 个
3. **批量处理**: 大量幻灯片时考虑分批导出
4. **缓存**: 相同图片会自动缓存 Base64 数据

## 🔄 版本兼容性

- **浏览器**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **PptxGenJS**: 3.12.0+
- **PPTX 版本**: PowerPoint 2010+

## 📄 许可证

本模块遵循 SU3PT 项目的许可证。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式联系：
- 提交 GitHub Issue
- 联系项目维护者

---

**最后更新**: 2025-01-14
**版本**: 1.0.0
