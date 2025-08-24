// Simple test plugin without external dependencies
export const handDrawnStylePlugin = {
  metadata: {
    id: 'hand-drawn-style',
    version: '1.0.0',
    description: 'Hand-drawn and sketchy map rendering styles',
    author: 'DOA Core',
    tags: ['render', 'style', 'hand-drawn', 'artistic']
  },
  
  supportedStyles: ['hand-drawn', 'sketchy'],
  
  render(dungeon: any, style: string, options: any = {}) {
    console.log(`Hand-drawn plugin rendering ${style} style`);
    
    // Simple hand-drawn style SVG
    const width = 800;
    const height = 600;
    
    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
      `<text x="400" y="300" text-anchor="middle" font-family="cursive" font-size="24" fill="#000000">Hand-drawn style working!</text>`,
      `</svg>`
    ];
    
    return {
      format: 'svg',
      data: parts.join(''),
      contentType: 'image/svg+xml',
      metadata: {
        style,
        renderTime: Date.now(),
        effects: ['test']
      }
    };
  }
};

export default handDrawnStylePlugin;