import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createJob, listPipelines, Pipeline, JobCreate } from "../api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Image,
  Mic,
  Volume2,
  Wand2,
  Palette,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const pipelineIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  text_to_text: MessageSquare,
  text_to_image: Image,
  text_to_speech: Volume2,
  speech_to_text: Mic,
  speech_to_image: Wand2,
  image_to_image: Palette,
};

const pipelineColors: Record<string, string> = {
  text_to_text: "from-blue-500 to-cyan-500",
  text_to_image: "from-purple-500 to-pink-500",
  text_to_speech: "from-green-500 to-emerald-500",
  speech_to_text: "from-orange-500 to-amber-500",
  speech_to_image: "from-rose-500 to-red-500",
  image_to_image: "from-indigo-500 to-violet-500",
};

export default function CreateJob() {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingPipelines, setLoadingPipelines] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Input states
  const [textInput, setTextInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  // Options
  const [style, setStyle] = useState("");
  const [language, setLanguage] = useState("en");
  const [quality, setQuality] = useState("high");

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    try {
      setLoadingPipelines(true);
      const data = await listPipelines();
      setPipelines(data.pipelines);
      if (data.pipelines.length > 0) {
        setSelectedPipeline(data.pipelines[0].type);
      }
    } catch (err) {
      setError("Failed to load pipelines");
      console.error(err);
    } finally {
      setLoadingPipelines(false);
    }
  };

  const getInputType = () => {
    if (!selectedPipeline) return null;
    if (selectedPipeline.includes("text_to")) return "text";
    if (selectedPipeline.includes("speech_to")) return "audio";
    if (selectedPipeline.includes("image_to")) return "image";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const inputs: Record<string, string> = {};
      if (textInput) inputs.text = textInput;
      if (imageUrl) inputs.image_url = imageUrl;
      if (audioUrl) inputs.audio_url = audioUrl;

      const options: Record<string, string> = {};
      if (style) options.style = style;
      if (language) options.language = language;
      if (quality) options.quality = quality;

      const jobCreate: JobCreate = {
        pipeline: selectedPipeline,
        inputs,
        options: Object.keys(options).length > 0 ? options : undefined,
      };

      const job = await createJob(jobCreate);
      navigate(`/jobs/${job.job_id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create job";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputType = getInputType();

  if (loadingPipelines) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading pipelines...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4 pb-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary-400 px-4 py-2 rounded-full text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          AI-Powered Generation
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
          Create Something <span className="gradient-text">Amazing</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Transform your ideas into reality with our multimodal AI platform.
          Generate text, images, and audio with a single click.
        </p>
      </div>

      {/* Pipeline Selection */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">Choose Your Pipeline</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {pipelines.map((pipeline, index) => {
            const Icon = pipelineIcons[pipeline.type] || Wand2;
            const gradientColor =
              pipelineColors[pipeline.type] || "from-gray-500 to-gray-600";
            const isSelected = selectedPipeline === pipeline.type;

            return (
              <button
                key={pipeline.type}
                type="button"
                onClick={() => setSelectedPipeline(pipeline.type)}
                className={cn(
                  "relative group p-6 rounded-xl border transition-all duration-300 text-left opacity-0 animate-slide-up",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
                )}
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: "forwards",
                }}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl" />
                )}
                <div
                  className={cn(
                    "relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br",
                    gradientColor
                  )}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground capitalize">
                  {pipeline.type.replace(/_/g, " → ")}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {pipeline.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Form */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Configure Your Request
          </CardTitle>
          <CardDescription>
            Provide the input for your selected pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-destructive/10 border border-destructive/30 text-red-400 px-4 py-3 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dynamic Input Field */}
            {inputType === "text" && (
              <div className="space-y-2">
                <Label htmlFor="text-input">Your Prompt</Label>
                <Textarea
                  id="text-input"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Describe what you want to create..."
                  className="min-h-[160px] text-base"
                />
              </div>
            )}

            {inputType === "audio" && (
              <div className="space-y-2">
                <Label htmlFor="audio-input">Audio URL</Label>
                <Input
                  id="audio-input"
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.wav"
                />
                <p className="text-xs text-muted-foreground">
                  Provide a direct URL to your audio file (WAV, MP3 supported)
                </p>
              </div>
            )}

            {inputType === "image" && (
              <div className="space-y-2">
                <Label htmlFor="image-input">Image URL</Label>
                <Input
                  id="image-input"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                />
                <p className="text-xs text-muted-foreground">
                  Provide a direct URL to your source image
                </p>
              </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="style">Style (optional)</Label>
                <Input
                  id="style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="cinematic, anime, realistic..."
                />
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quality</Label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Fast)</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High (Best)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="xl"
              disabled={loading || !selectedPipeline}
              className="w-full group"
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  Generate Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
