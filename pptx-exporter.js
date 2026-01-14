(function(window) {
  'use strict';

  const PPTXExporter = {
    pptxgen: null,
    isLibraryLoaded: false,

    log: function(level, message, data) {
      const timestamp = new Date().toISOString();
      const logEntry = { timestamp, level, message, data };
      console.log(`[PPTX导出 ${level.toUpperCase()}]`, message, data || '');
      return logEntry;
    },

    loadLibrary: function() {
      return new Promise((resolve, reject) => {
        if (this.isLibraryLoaded && window.PptxGenJS) {
          this.pptxgen = new PptxGenJS();
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
        script.onload = () => {
          if (window.PptxGenJS) {
            this.pptxgen = new PptxGenJS();
            this.isLibraryLoaded = true;
            this.log('info', 'PptxGenJS 库加载成功');
            resolve();
          } else {
            this.log('error', 'PptxGenJS 库加载失败', '全局对象未找到');
            reject(new Error('PptxGenJS 库加载失败'));
          }
        };
        script.onerror = () => {
          this.log('error', 'PptxGenJS 库加载失败', '网络错误或CDN不可达');
          reject(new Error('PptxGenJS 库加载失败'));
        };
        document.head.appendChild(script);
      });
    },

    pxToInch: function(px) {
      return px / 102.4;
    },

    parseColor: function(color) {
      if (!color) return '000000';
      
      if (color.startsWith('#')) {
        return color.substring(1);
      }
      
      if (color.startsWith('rgb')) {
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          return ((parseInt(rgb[0]) << 16) | (parseInt(rgb[1]) << 8) | parseInt(rgb[2])).toString(16).padStart(6, '0');
        }
      }
      
      if (color.startsWith('rgba')) {
        const rgba = color.match(/\d+/g);
        if (rgba && rgba.length >= 3) {
          return ((parseInt(rgba[0]) << 16) | (parseInt(rgba[1]) << 8) | parseInt(rgba[2])).toString(16).padStart(6, '0');
        }
      }
      
      const namedColors = {
        'red': 'FF0000', 'green': '008000', 'blue': '0000FF',
        'yellow': 'FFFF00', 'orange': 'FFA500', 'purple': '800080',
        'black': '000000', 'white': 'FFFFFF', 'gray': '808080'
      };
      
      return namedColors[color.toLowerCase()] || '000000';
    },

    extractGradientColors: function(gradientString) {
      const colorRegex = /#[0-9A-Fa-f]{6}|rgb\(\d+,\s*\d+,\s*\d+\)|rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)/g;
      const matches = gradientString.match(colorRegex);
      if (matches && matches.length >= 2) {
        return {
          color1: this.parseColor(matches[0]),
          color2: this.parseColor(matches[1])
        };
      }
      return { color1: '4F46E5', color2: '3B82F6' };
    },

    imageToBase64: function(url) {
      return new Promise((resolve, reject) => {
        if (url.startsWith('data:')) {
          const base64Data = url.split(',')[1];
          resolve(base64Data);
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // 添加超时处理
        const timeout = setTimeout(() => {
          console.error('图片加载超时:', url);
          reject(new Error('图片加载超时: ' + url));
        }, 10000); // 10秒超时
        
        img.onload = function() {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement('canvas');
            // 限制图片尺寸，防止内存溢出
            const maxSize = 2048;
            const width = Math.min(img.width, maxSize);
            const height = Math.min(img.height, maxSize);
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const base64Data = canvas.toDataURL('image/png').split(',')[1];
            resolve(base64Data);
          } catch (error) {
            console.error('图片转换Canvas错误:', error);
            reject(new Error('图片转换失败: ' + error.message));
          }
        };
        
        img.onerror = function(e) {
          clearTimeout(timeout);
          console.error('图片加载失败:', url, e);
          reject(new Error('图片加载失败: ' + url));
        };
        
        console.log('开始加载图片:', url);
        img.src = url;
      });
    },

    parseFontSize: function(fontSize) {
      if (!fontSize) return 18;
      const size = parseInt(fontSize);
      return isNaN(size) ? 18 : Math.max(10, Math.min(72, size));
    },

    parseFontWeight: function(fontWeight) {
      if (!fontWeight) return 'normal';
      if (fontWeight === 'bold' || fontWeight === '700' || fontWeight === '600') {
        return 'bold';
      }
      return 'normal';
    },

    parseTextAlign: function(textAlign) {
      const alignMap = {
        'left': 'left',
        'center': 'center',
        'right': 'right',
        'justify': 'justify'
      };
      return alignMap[textAlign] || 'left';
    },

    normalizeRotation: function(rotation) {
      if (!rotation) return 0;
      let rot = parseFloat(rotation);
      if (isNaN(rot)) return 0;
      rot = rot % 360;
      if (rot < 0) rot += 360;
      return rot;
    },

    stripHtmlTags: function(html) {
      if (!html) return '';
      const tmp = document.createElement('DIV');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    },

    extractTextFromHtml: function(html) {
      if (!html) return { title: '', body: '' };
      
      const titleMatch = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
      const title = titleMatch ? this.stripHtmlTags(titleMatch[1]) : '';
      
      const body = this.stripHtmlTags(html.replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi, ''));
      
      return { title, body };
    },

    addTextElement: function(slide, element) {
      try {
        const content = element.content || {};
        let titleText = content.title || '';
        let bodyText = content.body || '';

        if (element.type === 'gradient-card' || element.type === 'module-container') {
          const extracted = this.extractTextFromHtml(content.content || '');
          titleText = extracted.title || titleText;
          bodyText = extracted.body || bodyText;
        }

        const fullText = titleText && bodyText ? `${titleText}\n\n${bodyText}` : (titleText || bodyText || '占位文本');

        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 200, height: 100 };
        const style = element.style || {};

        const textOptions = {
          x: this.pxToInch(position.x),
          y: this.pxToInch(position.y),
          w: this.pxToInch(size.width),
          h: this.pxToInch(size.height),
          fontSize: this.parseFontSize(style.fontSize),
          fontFace: this.getFontFace(style.fontFamily),
          color: this.parseColor(style.color),
          bold: this.parseFontWeight(style.fontWeight) === 'bold',
          italic: style.fontStyle === 'italic',
          align: this.parseTextAlign(style.textAlign),
          valign: 'middle',
          isTextBox: true
        };

        if (element.rotation) {
          textOptions.rotate = this.normalizeRotation(element.rotation);
        }

        slide.addText(fullText, textOptions);
        this.log('info', '文本元素添加成功', { text: fullText.substring(0, 50) });
      } catch (error) {
        this.log('error', '文本元素添加失败', error.message);
        this.addPlaceholderText(slide, element);
      }
    },

    getFontFace: function(fontFamily) {
      const fontMap = {
        '微软雅黑': 'Microsoft YaHei',
        '黑体': 'SimHei',
        '宋体': 'SimSun',
        '楷体': 'KaiTi',
        'arial': 'Arial',
        'helvetica': 'Helvetica',
        'times new roman': 'Times New Roman'
      };
      
      if (!fontFamily) return 'Microsoft YaHei';
      
      const lowerFont = fontFamily.toLowerCase();
      for (const key in fontMap) {
        if (lowerFont.includes(key)) {
          return fontMap[key];
        }
      }
      
      return 'Microsoft YaHei';
    },

    addImageElement: function(slide, element) {
      return new Promise(async (resolve, reject) => {
        try {
          const content = element.content || {};
          let imageUrl = content.url || content.src || '';
          
          this.log('info', '处理图片元素', { 
            hasUrl: !!content.url, 
            hasSrc: !!content.src,
            imageUrl: imageUrl.substring(0, 100)
          });
          
          if (!imageUrl) {
            this.log('warn', '图片元素缺少URL，跳过', { content: Object.keys(content) });
            resolve();
            return;
          }

          const position = element.position || { x: 0, y: 0 };
          const size = element.size || { width: 200, height: 200 };

          try {
            this.log('info', '开始加载图片', { url: imageUrl });
            const base64Data = await this.imageToBase64(imageUrl);
            
            if (!base64Data) {
              this.log('error', '图片转换失败，base64为空');
              this.addPlaceholderImage(slide, element);
              resolve();
              return;
            }
            
            const imageOptions = {
              x: this.pxToInch(position.x),
              y: this.pxToInch(position.y),
              w: this.pxToInch(size.width),
              h: this.pxToInch(size.height),
              data: `data:image/png;base64,${base64Data}`
            };

            if (element.rotation) {
              imageOptions.rotate = this.normalizeRotation(element.rotation);
            }

            slide.addImage(imageOptions);
            this.log('info', '图片元素添加成功', { 
              url: imageUrl.substring(0, 50),
              position: { x: imageOptions.x, y: imageOptions.y },
              size: { w: imageOptions.w, h: imageOptions.h }
            });
          } catch (imgError) {
            this.log('error', '图片转换失败，添加占位符', imgError.message);
            this.addPlaceholderImage(slide, element);
          }
          
          resolve();
        } catch (error) {
          this.log('error', '图片元素添加失败', error.message);
          resolve();
        }
      });
    },

    addChartElement: function(slide, element) {
      try {
        const content = element.content || {};
        const chartType = content.type || 'bar';
        const categories = content.categories || [];
        const series = content.series || [];

        if (categories.length === 0 || series.length === 0) {
          this.log('warn', '图表数据不完整，添加占位符');
          this.addPlaceholderChart(slide, element);
          return;
        }

        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 400, height: 300 };

        const chartData = [];
        series.forEach((serie, index) => {
          const dataPoint = {
            name: serie.name || `系列${index + 1}`,
            labels: categories,
            values: serie.data || []
          };
          chartData.push(dataPoint);
        });

        const chartOptions = {
          x: this.pxToInch(position.x),
          y: this.pxToInch(position.y),
          w: this.pxToInch(size.width),
          h: this.pxToInch(size.height),
          chartType: this.mapChartType(chartType),
          data: chartData,
          showLegend: true,
          showTitle: false
        };

        if (element.rotation) {
          chartOptions.rotate = this.normalizeRotation(element.rotation);
        }

        slide.addChart(chartOptions.chartType, chartData, {
          x: chartOptions.x,
          y: chartOptions.y,
          w: chartOptions.w,
          h: chartOptions.h
        });

        this.log('info', '图表元素添加成功', { type: chartType });
      } catch (error) {
        this.log('error', '图表元素添加失败', error.message);
        this.addPlaceholderChart(slide, element);
      }
    },

    mapChartType: function(type) {
      const typeMap = {
        'bar': 'bar',
        'column': 'bar',
        'line': 'line',
        'pie': 'pie',
        'doughnut': 'pie',
        'area': 'area',
        'scatter': 'scatter'
      };
      return typeMap[type.toLowerCase()] || 'bar';
    },

    addGradientPanel: function(slide, element) {
      try {
        const content = element.content || {};
        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 300, height: 200 };

        let color1 = content.color1 || content.gradientColor1 || '4F46E5';
        let color2 = content.color2 || content.gradientColor2 || '3B82F6';

        if (element.type === 'gradient-overlay' || element.type === 'gradient-mask') {
          const gradient = element.type === 'gradient-overlay' ? 
            'linear-gradient(45deg, ' + content.color1 + ' 0%, ' + content.color2 + ' 100%)' :
            'linear-gradient(45deg, ' + content.color1 + ' 0%, ' + content.color2 + ' 100%)';
          const colors = this.extractGradientColors(gradient);
          color1 = colors.color1;
          color2 = colors.color2;
        }

        const rectOptions = {
          x: this.pxToInch(position.x),
          y: this.pxToInch(position.y),
          w: this.pxToInch(size.width),
          h: this.pxToInch(size.height),
          fill: { color: color1 },
          line: { color: color2, width: 2 }
        };

        if (element.rotation) {
          rectOptions.rotate = this.normalizeRotation(element.rotation);
        }

        slide.addShape(this.pptxgen.ShapeType.rect, rectOptions);

        if (content.text || content.content) {
          const text = content.text || this.extractTextFromHtml(content.content).body;
          if (text) {
            const textOptions = {
              x: this.pxToInch(position.x + 20),
              y: this.pxToInch(position.y + 20),
              w: this.pxToInch(size.width - 40),
              h: this.pxToInch(size.height - 40),
              fontSize: 16,
              fontFace: 'Microsoft YaHei',
              color: 'FFFFFF',
              align: 'left',
              valign: 'top',
              isTextBox: true
            };
            slide.addText(text, textOptions);
          }
        }

        this.log('info', '渐变面板添加成功', { type: element.type });
      } catch (error) {
        this.log('error', '渐变面板添加失败', error.message);
      }
    },

    addProgressRing: function(slide, element) {
      try {
        const content = element.content || {};
        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 200, height: 200 };

        const centerX = position.x + size.width / 2;
        const centerY = position.y + size.height / 2;
        const radius = Math.min(size.width, size.height) / 2 - 10;

        const bgCircleOptions = {
          x: this.pxToInch(centerX - radius),
          y: this.pxToInch(centerY - radius),
          w: this.pxToInch(radius * 2),
          h: this.pxToInch(radius * 2),
          fill: { color: 'E5E7EB' },
          line: { color: 'D1D5DB', width: 4 }
        };

        slide.addShape(this.pptxgen.ShapeType.ellipse, bgCircleOptions);

        const progress = content.progress || 0.5;
        const progressColor = content.color || '10B981';

        const progressCircleOptions = {
          x: this.pxToInch(centerX - radius),
          y: this.pxToInch(centerY - radius),
          w: this.pxToInch(radius * 2),
          h: this.pxToInch(radius * 2),
          fill: { color: progressColor },
          line: { color: progressColor, width: 4 }
        };

        slide.addShape(this.pptxgen.ShapeType.ellipse, progressCircleOptions);

        const progressText = Math.round(progress * 100) + '%';
        const textOptions = {
          x: this.pxToInch(centerX - 30),
          y: this.pxToInch(centerY - 15),
          w: this.pxToInch(60),
          h: this.pxToInch(30),
          fontSize: 24,
          fontFace: 'Microsoft YaHei',
          color: '1F2937',
          bold: true,
          align: 'center',
          valign: 'middle'
        };

        slide.addText(progressText, textOptions);

        if (content.text) {
          const labelTextOptions = {
            x: this.pxToInch(centerX - 50),
            y: this.pxToInch(centerY + radius - 10),
            w: this.pxToInch(100),
            h: this.pxToInch(20),
            fontSize: 12,
            fontFace: 'Microsoft YaHei',
            color: '6B7280',
            align: 'center',
            valign: 'top'
          };
          slide.addText(content.text, labelTextOptions);
        }

        this.log('info', '进度环添加成功', { progress });
      } catch (error) {
        this.log('error', '进度环添加失败', error.message);
      }
    },

    addTechStack: function(slide, element) {
      try {
        const content = element.content || {};
        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 400, height: 200 };

        const items = content.items || [];
        const itemColor = content.itemColor || '4F46E5';

        const itemWidth = (size.width - 20) / Math.min(items.length, 4);
        const itemHeight = 40;
        const padding = 10;

        items.forEach((item, index) => {
          const col = index % 4;
          const row = Math.floor(index / 4);

          const itemX = position.x + col * (itemWidth + padding) + padding;
          const itemY = position.y + row * (itemHeight + padding) + padding;

          const bgOptions = {
            x: this.pxToInch(itemX),
            y: this.pxToInch(itemY),
            w: this.pxToInch(itemWidth),
            h: this.pxToInch(itemHeight),
            fill: { color: itemColor },
            rectRadius: 4
          };

          slide.addShape(this.pptxgen.ShapeType.rect, bgOptions);

          const textOptions = {
            x: this.pxToInch(itemX + 5),
            y: this.pxToInch(itemY + 5),
            w: this.pxToInch(itemWidth - 10),
            h: this.pxToInch(itemHeight - 10),
            fontSize: 14,
            fontFace: 'Microsoft YaHei',
            color: 'FFFFFF',
            align: 'center',
            valign: 'middle'
          };

          slide.addText(item, textOptions);
        });

        this.log('info', '技术栈添加成功', { itemCount: items.length });
      } catch (error) {
        this.log('error', '技术栈添加失败', error.message);
      }
    },

    addListElement: function(slide, element) {
      try {
        const content = element.content || {};
        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 300, height: 200 };
        const style = element.style || {};

        const items = content.items || [];
        const lineHeight = parseInt(style.lineHeight) || 30;
        const fontSize = this.parseFontSize(style.fontSize);

        let listText = '';
        items.forEach((item, index) => {
          if (typeof item === 'object' && item.text) {
            const prefix = item.prefix || (index + 1).toString().padStart(2, '0');
            listText += `${prefix}. ${item.text}\n`;
          } else {
            listText += `• ${item}\n`;
          }
        });

        const textOptions = {
          x: this.pxToInch(position.x),
          y: this.pxToInch(position.y),
          w: this.pxToInch(size.width),
          h: this.pxToInch(size.height),
          fontSize: fontSize,
          fontFace: 'Microsoft YaHei',
          color: this.parseColor(style.color),
          align: 'left',
          valign: 'top',
          isTextBox: true
        };

        if (element.rotation) {
          textOptions.rotate = this.normalizeRotation(element.rotation);
        }

        slide.addText(listText, textOptions);
        this.log('info', '列表元素添加成功', { itemCount: items.length });
      } catch (error) {
        this.log('error', '列表元素添加失败', error.message);
        this.addPlaceholderText(slide, element);
      }
    },

    addDecoratorElement: function(slide, element) {
      try {
        const content = element.content || {};
        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 400, height: 4 };

        let color1 = content.color1 || content.startColor || content.color || '4F46E5';
        let color2 = content.color2 || content.endColor || '3B82F6';

        if (content.color && !content.color1 && !content.color2) {
          color1 = this.parseColor(content.color);
          color2 = color1;
        } else {
          color1 = this.parseColor(color1);
          color2 = this.parseColor(color2);
        }

        const lineOptions = {
          x: this.pxToInch(position.x),
          y: this.pxToInch(position.y),
          w: this.pxToInch(size.width),
          h: this.pxToInch(size.height),
          fill: { color: color1 },
          line: { color: color2, width: 0 }
        };

        slide.addShape(this.pptxgen.ShapeType.rect, lineOptions);
        this.log('info', '装饰元素添加成功', { type: element.type });
      } catch (error) {
        this.log('error', '装饰元素添加失败', error.message);
      }
    },

    addPlaceholderText: function(slide, element) {
      try {
        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 200, height: 50 };

        const textOptions = {
          x: this.pxToInch(position.x),
          y: this.pxToInch(position.y),
          w: this.pxToInch(size.width),
          h: this.pxToInch(size.height),
          fontSize: 12,
          fontFace: 'Microsoft YaHei',
          color: '9CA3AF',
          align: 'center',
          valign: 'middle',
          isTextBox: true
        };

        slide.addText('[文本占位符]', textOptions);
      } catch (error) {
        this.log('error', '占位符文本添加失败', error.message);
      }
    },

    addPlaceholderImage: function(slide, element) {
      try {
        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 200, height: 200 };

        const rectOptions = {
          x: this.pxToInch(position.x),
          y: this.pxToInch(position.y),
          w: this.pxToInch(size.width),
          h: this.pxToInch(size.height),
          fill: { color: 'E5E7EB' },
          line: { color: 'D1D5DB', width: 2 }
        };

        slide.addShape(this.pptxgen.ShapeType.rect, rectOptions);

        const textOptions = {
          x: this.pxToInch(position.x + 10),
          y: this.pxToInch(position.y + size.height / 2 - 15),
          w: this.pxToInch(size.width - 20),
          h: this.pxToInch(30),
          fontSize: 12,
          fontFace: 'Microsoft YaHei',
          color: '6B7280',
          align: 'center',
          valign: 'middle'
        };

        slide.addText('[图片占位符]', textOptions);
      } catch (error) {
        this.log('error', '占位符图片添加失败', error.message);
      }
    },

    addPlaceholderChart: function(slide, element) {
      try {
        const position = element.position || { x: 0, y: 0 };
        const size = element.size || { width: 300, height: 200 };

        const rectOptions = {
          x: this.pxToInch(position.x),
          y: this.pxToInch(position.y),
          w: this.pxToInch(size.width),
          h: this.pxToInch(size.height),
          fill: { color: 'FEF3C7' },
          line: { color: 'F59E0B', width: 2 }
        };

        slide.addShape(this.pptxgen.ShapeType.rect, rectOptions);

        const textOptions = {
          x: this.pxToInch(position.x + 10),
          y: this.pxToInch(position.y + size.height / 2 - 15),
          w: this.pxToInch(size.width - 20),
          h: this.pxToInch(30),
          fontSize: 12,
          fontFace: 'Microsoft YaHei',
          color: '92400E',
          align: 'center',
          valign: 'middle'
        };

        slide.addText('[图表占位符]', textOptions);
      } catch (error) {
        this.log('error', '占位符图表添加失败', error.message);
      }
    },

    processElement: function(slide, element) {
      try {
        const type = element.type || 'unknown';
        this.log('info', '处理元素', { type, id: element.id });

        switch (type) {
          case 'text':
            this.addTextElement(slide, element);
            break;
          case 'image':
            return this.addImageElement(slide, element);
          case 'chart':
            this.addChartElement(slide, element);
            break;
          case 'gradient-panel':
          case 'gradient-card':
          case 'gradient-overlay':
          case 'gradient-mask':
            this.addGradientPanel(slide, element);
            break;
          case 'progress-ring':
            this.addProgressRing(slide, element);
            break;
          case 'tech-stack':
            this.addTechStack(slide, element);
            break;
          case 'list':
            this.addListElement(slide, element);
            break;
          case 'gradient-decorator':
          case 'deco-line':
          case 'section-divider':
          case 'dynamic-divider':
            this.addDecoratorElement(slide, element);
            break;
          case 'icon-badge':
          case 'dynamic-connector':
          case 'module-container':
            this.addTextElement(slide, element);
            break;
          default:
            this.log('warn', '未知元素类型，回退为文本元素', { type });
            this.addTextElement(slide, element);
        }
      } catch (error) {
        this.log('error', '元素处理失败', { type: element.type, error: error.message });
      }
    },

    processSlide: function(slideData) {
      return new Promise(async (resolve) => {
        try {
          const slide = this.pptxgen.addSlide();

          if (slideData.title) {
            slide.background = { color: 'FFFFFF' };
          }

          if (slideData.backgroundColor) {
            if (slideData.backgroundColor.startsWith('#') || slideData.backgroundColor.startsWith('rgb')) {
              slide.background = { color: this.parseColor(slideData.backgroundColor) };
            } else if (slideData.backgroundColor.includes('gradient')) {
              const colors = this.extractGradientColors(slideData.backgroundColor);
              slide.background = { color: colors.color1 };
            }
          }

          if (slideData.backgroundImage) {
            try {
              const base64Data = await this.imageToBase64(slideData.backgroundImage);
              slide.background = { data: `data:image/png;base64,${base64Data}` };
            } catch (error) {
              this.log('warn', '背景图片加载失败', error.message);
            }
          }

          const elements = slideData.elements || [];
          const sortedElements = [...elements].sort((a, b) => {
            const zIndexA = a.zIndex || 0;
            const zIndexB = b.zIndex || 0;
            return zIndexA - zIndexB;
          });

          for (const element of sortedElements) {
            await this.processElement(slide, element);
          }

          this.log('info', '幻灯片处理完成', { title: slideData.title, elementCount: elements.length });
          resolve();
        } catch (error) {
          this.log('error', '幻灯片处理失败', { title: slideData.title, error: error.message });
          resolve();
        }
      });
    },

    generate: async function(presentationData) {
      try {
        this.log('info', '开始生成PPTX', { slideCount: presentationData.slides?.length || 0 });

        await this.loadLibrary();

        // 设置PPTX为16:9比例（10英寸 × 5.625英寸）
        this.pptxgen.layout = 'LAYOUT_16x9';
        this.pptxgen.author = 'SU3PT';
        this.pptxgen.title = '可编辑演示文稿';
        this.pptxgen.subject = '由SU3PT生成的可编辑演示文稿';

        const slides = presentationData.slides || [];
        for (const slideData of slides) {
          await this.processSlide(slideData);
        }

        const fileName = `可编辑演示文稿_${new Date().toISOString().slice(0, 10)}.pptx`;
        await this.pptxgen.writeFile({ fileName });

        this.log('info', 'PPTX生成成功', { fileName });
        return { success: true, fileName };
      } catch (error) {
        this.log('error', 'PPTX生成失败', error.message);
        return { success: false, error: error.message };
      }
    }
  };

  window.PPTXExporter = PPTXExporter;

  if (window.pptManager) {
    window.pptManager.generateEditablePPTX = async function() {
      const presentationData = this.getPresentationData();
      if (!presentationData) {
        console.error('无法获取演示文稿数据');
        return { success: false, error: '无法获取演示文稿数据' };
      }
      return await PPTXExporter.generate(presentationData);
    };
  }

})(window);
