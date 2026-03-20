import { Node } from '@tiptap/core';

function toEmbedUrl(url: string): string {
  if (url.includes('youtube.com/watch?v=') || url.includes('youtu.be/')) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  }
  if (url.includes('youtube.com/embed/')) return url;
  if (url.includes('vimeo.com')) {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : url;
  }
  return url;
}

export const VideoExtension = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-video-embed]',
        getAttrs: (dom) => ({
          src: (dom as HTMLElement).getAttribute('data-src'),
        }),
      },
      {
        tag: 'div.video-embed-wrapper',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const dataSrc = el.getAttribute('data-src');
          if (dataSrc) return { src: dataSrc };
          const iframe = el.querySelector('iframe');
          const videoEl = el.querySelector('video');
          const src = iframe?.getAttribute('src') ?? videoEl?.getAttribute('src') ?? null;
          return { src };
        },
      },
    ];
  },
  renderHTML({ node }) {
    const src = node.attrs.src;
    if (!src) return ['div', { class: 'video-embed-wrapper' }, 0];
    const isYoutubeOrVimeo =
      src.includes('youtube.com') || src.includes('youtu.be') || src.includes('vimeo.com');
    if (isYoutubeOrVimeo) {
      const embedSrc = toEmbedUrl(src);
      return [
        'div',
        { class: 'video-embed-wrapper', 'data-src': src },
        ['iframe', { src: embedSrc, class: 'w-full aspect-video rounded', allowfullscreen: 'true', frameborder: '0' }],
      ];
    }
    return [
      'div',
      { class: 'video-embed-wrapper', 'data-src': src },
      ['video', { src, controls: '', class: 'w-full max-w-lg rounded' }],
    ];
  },
});
