import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Palette, Sparkles, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FormatSelector, { FORMAT_OPTIONS, type FormatOption } from "@/components/creative/FormatSelector";
import StyleChips from "@/components/creative/StyleChips";
import ImagePreview from "@/components/creative/ImagePreview";
import ReferenceImageUpload from "@/components/creative/ReferenceImageUpload";
import { useCreativeAssets } from "@/hooks/useCreativeAssets";
import { useProjects } from "@/contexts/ProjectContext";
import { toast } from "@/hooks/use-toast";

export default function Creative() {
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const { projects } = useProjects();

  const [selectedFormat, setSelectedFormat] = useState<FormatOption>(FORMAT_OPTIONS[0]);
  const [style, setStyle] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedBase64, setGeneratedBase64] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");

  const { assets, isLoading: assetsLoading, generating, generate, deleteAsset } = useCreativeAssets();

  // Pre-fill project context
  const linkedProject = projectIdParam
    ? projects.find((p) => p.id === projectIdParam)
    : null;

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: "Descreva sua ideia", description: "O campo de prompt não pode estar vazio.", variant: "destructive" });
      return;
    }
    setIsSaved(false);
    const contextPrompt = linkedProject
      ? `Para o projeto "${linkedProject.name}" do artista "${linkedProject.artist}". ${prompt}`
      : prompt;

    const result = await generate({
      prompt: contextPrompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: referenceImage || undefined,
      projectId: projectIdParam || undefined,
    });

    if (result) {
      setGeneratedImage(result.imageUrl);
      setGeneratedBase64(result.imageBase64);
      setIsSaved(true); // auto-saved by edge function
    }
  }, [prompt, style, selectedFormat, linkedProject, projectIdParam, generate, referenceImage]);

  const handleRegenerate = useCallback(async () => {
    setIsSaved(false);
    const contextPrompt = linkedProject
      ? `Para o projeto "${linkedProject.name}" do artista "${linkedProject.artist}". ${prompt}`
      : prompt;

    const result = await generate({
      prompt: contextPrompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: referenceImage || undefined,
      projectId: projectIdParam || undefined,
    });

    if (result) {
      setGeneratedImage(result.imageUrl);
      setGeneratedBase64(result.imageBase64);
      setIsSaved(true);
    }
  }, [prompt, style, selectedFormat, linkedProject, projectIdParam, generate, referenceImage]);

  const handleUseAsReference = (url: string) => {
    setReferenceImage(url);
    setActiveTab("create");
  };

  const handleEdit = () => {
    setEditPrompt("");
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editPrompt.trim() || !generatedBase64) return;
    setEditingLoading(true);
    const result = await generate({
      prompt: editPrompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: generatedBase64,
      projectId: projectIdParam || undefined,
    });
    if (result) {
      setGeneratedImage(result.imageUrl);
      setGeneratedBase64(result.imageBase64);
      setIsSaved(true);
    }
    setEditingLoading(false);
    setEditDialogOpen(false);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `criativo_${selectedFormat.id}_${Date.now()}.png`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Criativo</h1>
        {linkedProject && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {linkedProject.name}
          </span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Criar
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <ImageIcon className="h-3.5 w-3.5 mr-1" /> Galeria ({assets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-5 mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Controls */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Formato</label>
                <FormatSelector selected={selectedFormat.id} onSelect={setSelectedFormat} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Estilo (opcional)</label>
                <StyleChips selected={style} onSelect={setStyle} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Imagem de referência (opcional)
                </label>
                <ReferenceImageUpload image={referenceImage} onImageChange={setReferenceImage} />
                {referenceImage && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    A IA usará esta imagem como base para criar sua peça.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descreva sua ideia</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Capa minimalista com violão acústico e tons terrosos para single de MPB"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                {generating ? "Gerando…" : referenceImage ? "Gerar a partir da referência" : "Gerar Imagem"}
              </Button>
            </div>

            {/* Right: Preview */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Preview</label>
              <ImagePreview
                imageUrl={generatedImage}
                isLoading={generating}
                isSaving={false}
                isSaved={isSaved}
                onRegenerate={handleRegenerate}
                onEdit={handleEdit}
                onDownload={handleDownload}
                onSave={() => {}}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="mt-4">
          {assetsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma criação ainda.</p>
              <p className="text-xs mt-1">Gere sua primeira imagem na aba Criar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map((a) => (
                <Card key={a.id} className="overflow-hidden group relative">
                  <CardContent className="p-0">
                    <img
                      src={a.public_url || ""}
                      alt={a.prompt.slice(0, 60)}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-[10px] text-white/80 line-clamp-2">{a.prompt}</p>
                      <div className="flex gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/80 hover:text-white"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = a.public_url || "";
                            link.download = `criativo_${a.format}.png`;
                            link.target = "_blank";
                            link.click();
                          }}
                        >
                          <ImageIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/80 hover:text-primary"
                          title="Usar como referência"
                          onClick={() => handleUseAsReference(a.public_url || "")}
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white/80 hover:text-destructive"
                          onClick={() => deleteAsset(a.id, a.storage_path)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar com IA</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Descreva as alterações que deseja na imagem.
          </p>
          <Input
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Ex: Adicionar texto 'Novo Single' no centro"
          />
          <Button onClick={handleEditSubmit} disabled={editingLoading || !editPrompt.trim()}>
            {editingLoading ? "Aplicando…" : "Aplicar Edição"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
