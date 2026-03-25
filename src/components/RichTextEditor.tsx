import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  ImageIcon,
  Video,
  Upload,
  Link2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useCallback, useRef, useState } from 'react';
import { VideoExtension } from '@/extensions/VideoExtension';
import { uploadQuestionMedia } from '@/services/media';
import { useToast } from '@/components/ui/use-toast';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Enter your question here...',
  className,
  error,
}: RichTextEditorProps) {
  const { toast } = useToast();
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const [uploadingKind, setUploadingKind] = useState<'image' | 'video' | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      VideoExtension,
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn('focus:outline-none min-h-[120px] p-3', error && 'border-destructive'),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const addImageFromUrl = useCallback(() => {
    const url = window.prompt('Image URL:');
    if (url?.trim()) {
      editor?.chain().focus().setImage({ src: url.trim() }).run();
    }
  }, [editor]);

  const addVideoFromUrl = useCallback(() => {
    const url = window.prompt('Video URL (YouTube, Vimeo, or direct link):');
    if (url?.trim()) {
      editor?.chain().focus().insertContent({ type: 'video', attrs: { src: url.trim() } }).run();
    }
  }, [editor]);

  const onImageFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;
      setUploadingKind('image');
      try {
        const url = await uploadQuestionMedia(file);
        editor.chain().focus().setImage({ src: url }).run();
        toast({ title: 'Image uploaded' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
      } finally {
        setUploadingKind(null);
      }
    },
    [editor, toast]
  );

  const onVideoFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;
      setUploadingKind('video');
      try {
        const url = await uploadQuestionMedia(file);
        editor.chain().focus().insertContent({ type: 'video', attrs: { src: url } }).run();
        toast({ title: 'Video uploaded' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
      } finally {
        setUploadingKind(null);
      }
    },
    [editor, toast]
  );

  if (!editor) {
    return null;
  }

  const uploadBusy = uploadingKind !== null;

  return (
    <div className={cn('border rounded-md', error && 'border-destructive', className)}>
      <input
        ref={imageFileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={onImageFileSelected}
      />
      <input
        ref={videoFileRef}
        type="file"
        accept=".mp4,.webm,.ogg,.mov,.m4v,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={onVideoFileSelected}
      />

      <div className="flex items-center gap-1 p-2 border-b bg-muted/50 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('bold') && 'bg-background')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('italic') && 'bg-background')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('underline') && 'bg-background')}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn('h-8 w-8 p-0', editor.isActive('heading', { level: 1 }) && 'bg-background')}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn('h-8 w-8 p-0', editor.isActive('heading', { level: 2 }) && 'bg-background')}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('bulletList') && 'bg-background')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('orderedList') && 'bg-background')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => imageFileRef.current?.click()}
          disabled={uploadBusy}
          className="h-8 px-2 gap-1"
          title="Upload image from computer"
        >
          {uploadingKind === 'image' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addImageFromUrl}
          disabled={uploadBusy}
          className="h-8 w-8 p-0"
          title="Insert image from URL"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => videoFileRef.current?.click()}
          disabled={uploadBusy}
          className="h-8 px-2 gap-1"
          title="Upload video from computer"
        >
          {uploadingKind === 'video' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <Video className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addVideoFromUrl}
          disabled={uploadBusy}
          className="h-8 w-8 p-0"
          title="Insert video from URL"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-[120px] max-h-[400px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
