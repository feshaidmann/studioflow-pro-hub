import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Props {
  image: string | null;
  onImageChange: (base64: string | null) => void;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export default function ReferenceImageUpload({ image, onImageChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Use PNG, JPG ou WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onImageChange(reader.result as string);
    reader.readAsDataURL(file);
  }, [onImageChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  if (image) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border/40 inline-block">
        <img src={image} alt="Referência" className="h-24 w-auto object-contain" />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6"
          onClick={() => onImageChange(null)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <ImageIcon className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/60" />
      <p className="text-xs text-muted-foreground">
        Arraste uma imagem ou <span className="text-primary font-medium">escolha um arquivo</span>
      </p>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">PNG, JPG, WEBP — máx. 5 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
