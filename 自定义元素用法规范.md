# SU3PT自定义元素用法规范

## 一、概述

本规范旨在统一SU3PT演示文稿系统中自定义元素的定义和使用方式，确保代码的可读性、可维护性和一致性。所有自定义元素应遵循本规范进行设计和实现。

## 二、自定义元素的基本结构

自定义元素在JSON文件的`customElements`数组中定义，每个元素包含以下字段：

```json
{
  "type": "element-type", // 元素类型标识符
  "template": "<div>...</div>", // HTML模板
  "description": "元素描述", // 元素功能说明
  "variables": ["var1", "var2"] // 支持的变量列表
}
```

## 三、命名规范

1. **元素类型命名**
   - 使用kebab-case（短横线分隔）格式
   - 命名应简洁明了，反映元素的功能
   - 示例：`gradient-card`、`icon-badge`

2. **变量命名**
   - 使用camelCase格式
   - 变量名应具有描述性，反映变量的用途
   - 示例：`color1`、`borderRadius`

## 四、模板规范

1. **HTML结构**
   - 保持结构简洁，避免嵌套过深
   - 优先使用语义化HTML标签
   - 所有样式应尽量内联，确保元素的独立性

2. **样式规范**
   - 使用内联`style`属性定义样式
   - 颜色值使用HEX格式（如`#ff0000`）或rgba格式（如`rgba(0,0,0,0.5)`）
   - 尺寸单位优先使用`px`
   - 边框圆角使用`borderRadius`属性
   - 阴影效果使用`boxShadow`属性

3. **示例模板**
   ```html
   <div style='background: linear-gradient(135deg, \{\{color1\}\} 0%, \{\{color2\}\} 100%); border-radius: 12px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); color: white;'>
     \{\{content\}\}
   </div>
   ```

## 五、变量系统规范

### 5.1 变量类型

1. **简单变量**
   - 格式：`\{\{variableName\}\}`
   - 用于替换文本、颜色、尺寸等简单值
   - 示例：`\{\{color\}\}`、`\{\{text\}\}`

2. **数组循环**
   - 格式：`\{\{each arrayName\}\}...\{\{/each\}\}`
   - 用于遍历数组数据并生成重复内容
   - 内部可使用`\{\{this\}\}`引用当前数组项
   - 示例：
     ```html
     \{\{each items\}\}<li>\{\{this\}\}</li>\{\{/each\}\}
     ```

3. **索引变量**
   - 格式：`\{\{index\}\}`（推荐）或`\{\{@index\}\}`（兼容旧版）
   - 仅在数组循环中可用，表示当前项的索引（从0开始）
   - 示例：
     ```html
     \{\{each items\}\}<li>\{\{index + 1\}\}. \{\{this\}\}</li>\{\{/each\}\}
     ```

4. **对象属性**
   - 当数组项为对象时，可以直接引用其属性
   - 格式：`\{\{propertyName\}\}`
   - 示例：
     ```html
     \{\{each users\}\}<li>\{\{name\}\} - \{\{age\}\}</li>\{\{/each\}\}
     ```

### 5.2 变量使用规则

1. 所有在模板中使用的变量必须在`variables`数组中声明
2. 为必填变量提供默认值或在文档中明确标注
3. 避免在模板中使用复杂的JavaScript表达式
4. 对于URL等特殊值，确保其格式正确且完整

## 六、常见自定义元素类型及用法

### 6.1 基础装饰类

1. **gradient-decorator**（标题下装饰性渐变条）
   ```json
   {
     "type": "gradient-decorator",
     "content": {
       "color1": "#4a7cff",
       "color2": "#6dd6ff"
     }
   }
   ```

2. **title-underline**（标题装饰下划线）
   ```json
   {
     "type": "title-underline",
     "content": {
       "color": "#ffb400"
     }
   }
   ```

3. **deco-line**（渐变装饰分隔线）
   ```json
   {
     "type": "deco-line",
     "content": {
       "endColor": "#3B82F6",
       "margin": "30px auto",
       "startColor": "#6366F1",
       "width": 512
     }
   }
   ```

### 6.2 内容容器类

1. **gradient-card**（渐变色信息卡片）
   ```json
   {
     "type": "gradient-card",
     "content": {
       "color1": "#6366F1",
       "color2": "#3B82F6",
       "content": "<h4>标题</h4><p>内容</p>"
     }
   }
   ```

2. **highlight-card**（带阴影的高亮内容卡片）
   ```json
   {
     "type": "highlight-card",
     "content": {
       "color": "rgba(255,255,255,0.9)",
       "content": "内容文本",
       "height": 220,
       "width": 300
     }
   }
   ```

3. **module-container**（模块化内容容器）
   ```json
   {
     "type": "module-container",
     "content": {
       "bgColor": "rgba(255,255,255,0.9)"
     }
   }
   ```

### 6.3 图像相关类

1. **gradient-image-frame**（带渐变边框的图片容器）
   ```json
   {
     "type": "gradient-image-frame",
     "content": {
       "height": 220,
       "url": "https://example.com/image.jpg",
       "width": 300
     }
   }
   ```

### 6.4 数据展示类

1. **dynamic-arrow**（动态数据流向指示箭头）
   ```json
   {
     "type": "dynamic-arrow",
     "content": {
       "color": "#2196f3",
       "height": 300,
       "points": [
         {"height": 5, "width": 30, "x": 15, "y": 20},
         {"height": 5, "width": 25, "x": 45, "y": 60}
       ]
     }
   }
   ```

## 七、最佳实践

1. **保持简单**：自定义元素应专注于单一功能，避免过度设计
2. **可复用性**：设计时考虑元素的可复用场景，提取通用属性
3. **性能优化**：避免在模板中使用复杂的DOM结构和CSS动画
4. **错误处理**：为所有变量提供合理的默认值，避免因数据缺失导致渲染失败
5. **一致性**：遵循统一的设计语言和风格规范
6. **文档完备**：为每个自定义元素提供清晰的描述和使用示例

## 八、注意事项

1. 自定义元素的`zIndex`属性会影响元素的显示层级，请合理设置
2. 确保所有内联样式符合HTML标准，避免使用废弃的属性
3. 对于包含HTML内容的变量，确保内容安全，避免XSS风险
4. 数组循环中，确保传递的数据类型为数组，否则循环内容将被忽略
5. 在移动设备上，部分复杂自定义元素可能需要额外的响应式设计处理
