import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Palette, Sparkles, Trash2, ImageIcon, Download, Settings2, Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import FormatSelector, { FORMAT_OPTIONS, type FormatOption } from "@/components/creative/FormatSelector";
import StyleChips from "@/components/creative/StyleChips";
import ImagePreview from "@/components/creative/ImagePreview";
import ReferenceImageUpload from "@/components/creative/ReferenceImageUpload";
import DeriveBatchDialog from "@/components/creative/DeriveBatchDialog";
import GalleryDetailSheet from "@/components/creative/GalleryDetailSheet";
import QuickTemplates, { type QuickTemplate } from "@/components/creative/QuickTemplates";
import { useCreativeAssets } from "@/hooks/useCreativeAssets";
import { useProjects } from "@/contexts/ProjectContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCachedAnalysis } from "@/hooks/useSavedAnalyses";
import type { DiagnosisResult } from "@/hooks/useMusicDNA";

async function downloadFile(url: string, filename: string) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  const [deriveDialogOpen, setDeriveDialogOpen] = useState(false);
  const [deriveImageUrl, setDeriveImageUrl] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || "");

  // Gallery
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; path: string } | null>(null);
  const [detailAsset, setDetailAsset] = useState<any>(null);

  const { assets, isLoading: assetsLoading, generating, generate, generateBatch, deleteAsset } = useCreativeAssets();

  const linkedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  // Unified generate handler
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: "Descreva sua ideia", description: "O campo de prompt não pode estar vazio.", variant: "destructive" });
      return;
    }
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
      projectId: selectedProjectId || undefined,
    });

    if (result) {
      setGeneratedImage(result.imageUrl);
      setGeneratedBase64(result.imageBase64);
    }
  }, [prompt, style, selectedFormat, linkedProject, selectedProjectId, generate, referenceImage]);

  // Semantic variation: pass current image as reference with variation instruction
  const handleVariation = useCallback(async () => {
    if (!generatedBase64 || !prompt.trim()) {
      handleGenerate();
      return;
    }
    const variationPrompt = `Crie uma variação desta arte mantendo o conceito mas alterando composição e paleta. Conceito original: ${prompt}`;
    const result = await generate({
      prompt: variationPrompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: generatedBase64,
      projectId: selectedProjectId || undefined,
    });
    if (result) {
      setGeneratedImage(result.imageUrl);
      setGeneratedBase64(result.imageBase64);
    }
  }, [generatedBase64, prompt, style, selectedFormat, selectedProjectId, generate, handleGenerate]);

  const handleUseAsReference = (url: string) => {
    setReferenceImage(url);
    setActiveTab("create");
  };

  const handleDerive = (imageUrl: string) => {
    setDeriveImageUrl(imageUrl);
    setDeriveDialogOpen(true);
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
      projectId: selectedProjectId || undefined,
    });
    if (result) {
      setGeneratedImage(result.imageUrl);
      setGeneratedBase64(result.imageBase64);
    }
    setEditingLoading(false);
    setEditDialogOpen(false);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    downloadFile(generatedImage, `criativo_${selectedFormat.id}_${Date.now()}.png`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteAsset(deleteTarget.id, deleteTarget.path);
    setDeleteTarget(null);
  };

  const handleTemplateSelect = (template: QuickTemplate) => {
    setPrompt(template.prompt);
    setStyle(template.style);
    const fmt = FORMAT_OPTIONS.find((f) => f.id === template.formatId);
    if (fmt) setSelectedFormat(fmt);
    setSettingsOpen(true);
  };

  // Filtered gallery
  const filteredAssets = assets.filter((a) => {
    if (filterFormat !== "all" && a.format !== filterFormat) return false;
    if (filterProject !== "all" && (a.project_id || "") !== filterProject) return false;
    return true;
  });

  const assetFormats = [...new Set(assets.map((a) => a.format))];
  const assetProjectIds = [...new Set(assets.filter((a) => a.project_id).map((a) => a.project_id!))];

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
            {/* Left: Controls — Prompt first! */}
            <div className="space-y-4">
              {/* Quick templates when no prompt yet */}
              {!prompt.trim() && !generatedImage && (
                <QuickTemplates onSelect={handleTemplateSelect} />
              )}

              {/* PROMPT — protagonist */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Descreva sua ideia
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Capa minimalista com violão acústico e tons terrosos para single de MPB"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {/* Settings collapsible */}
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                  <Settings2 className="h-3.5 w-3.5" />
                  Configurações
                  <span className="text-[10px] ml-auto">
                    {selectedFormat.label} {style ? `· ${style}` : ""}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-3">
                  {/* Project selector */}
                  {projects.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Projeto (opcional)</label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Sem projeto vinculado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} — {p.artist}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
                </CollapsibleContent>
              </Collapsible>

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
                onRegenerate={handleVariation}
                onEdit={handleEdit}
                onDownload={handleDownload}
                onDerive={generatedImage ? () => handleDerive(generatedImage) : undefined}
                formatLabel={selectedFormat.label}
                aspectRatio={selectedFormat.width / selectedFormat.height}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="mt-4 space-y-4">
          {/* Gallery filters */}
          {assets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Select value={filterFormat} onValueChange={setFilterFormat}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os formatos</SelectItem>
                  {assetFormats.map((f) => {
                    const opt = FORMAT_OPTIONS.find((fo) => fo.id === f);
                    return <SelectItem key={f} value={f}>{opt?.label || f}</SelectItem>;
                  })}
                </SelectContent>
              </Select>

              {assetProjectIds.length > 0 && (
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os projetos</SelectItem>
                    {assetProjectIds.map((pid) => {
                      const proj = projects.find((p) => p.id === pid);
                      return <SelectItem key={pid} value={pid}>{proj?.name || "Projeto"}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {assetsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma criação ainda.</p>
              <p className="text-xs mt-1">Gere sua primeira imagem na aba Criar.</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma arte encontrada com esses filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAssets.map((a) => {
                const aspectClass = a.height > a.width
                  ? "aspect-[9/16]"
                  : a.width > a.height
                    ? "aspect-video"
                    : "aspect-square";
                return (
                  <Card
                    key={a.id}
                    className="overflow-hidden cursor-pointer group relative"
                    onClick={() => setDetailAsset(a)}
                  >
                    <CardContent className="p-0">
                      <img
                        src={a.public_url || ""}
                        alt={a.prompt.slice(0, 60)}
                        className={`w-full ${aspectClass} object-cover`}
                        loading="lazy"
                      />
                      {/* Desktop hover overlay — minimal info */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                        <p className="text-[10px] text-white/90 line-clamp-2">{a.prompt}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Gallery Detail Sheet (mobile-friendly) */}
      <GalleryDetailSheet
        asset={detailAsset}
        open={!!detailAsset}
        onOpenChange={(open) => !open && setDetailAsset(null)}
        onDownload={downloadFile}
        onUseAsReference={handleUseAsReference}
        onDerive={handleDerive}
        onDelete={(id, path) => { setDetailAsset(null); setDeleteTarget({ id, path }); }}
        projectName={detailAsset?.project_id ? projects.find((p) => p.id === detailAsset.project_id)?.name : undefined}
      />

      {/* Edit Dialog — Textarea instead of Input */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar com IA</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Descreva as alterações que deseja na imagem.
          </p>
          <Textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Ex: Remover o fundo, adicionar gradiente azul, e colocar o título 'Novo Single' em letras brancas no topo"
            rows={3}
            className="text-sm resize-none"
          />
          <Button onClick={handleEditSubmit} disabled={editingLoading || !editPrompt.trim()}>
            {editingLoading ? "Aplicando…" : "Aplicar Edição"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arte?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. A imagem será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Derive Batch Dialog */}
      <DeriveBatchDialog
        open={deriveDialogOpen}
        onOpenChange={setDeriveDialogOpen}
        baseImageUrl={deriveImageUrl}
        basePrompt={prompt}
        style={style}
        projectId={selectedProjectId || undefined}
        onGenerateBatch={generateBatch}
      />
    </div>
  );
}
