import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getJob, Job } from '../api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { 
  MessageSquare, 
  Image, 
  Mic, 
  Volume2, 
  Wand2, 
  Palette,
  AlertCircle,
  Clock,
  ArrowLeft,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  ImageIcon,
  Music,
  Cpu,
  Timer
} from 'lucide-react'

const pipelineIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text_to_text: MessageSquare,
  text_to_image: Image,
  text_to_speech: Volume2,
  speech_to_text: Mic,
  speech_to_image: Wand2,
  image_to_image: Palette,
}

const pipelineGradients: Record<string, string> = {
  text_to_text: "from-blue-500 to-cyan-500",
  text_to_image: "from-purple-500 to-pink-500",
  text_to_speech: "from-green-500 to-emerald-500",
  speech_to_text: "from-orange-500 to-amber-500",
  speech_to_image: "from-rose-500 to-red-500",
  image_to_image: "from-indigo-500 to-violet-500",
}

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (jobId) {
      loadJob()
    }
  }, [jobId])

  useEffect(() => {
    if (!polling || !jobId) return

    if (job && (job.status === 'queued' || job.status === 'running')) {
      const interval = setInterval(() => {
        loadJob()
      }, 2000)

      return () => clearInterval(interval)
    } else {
      setPolling(false)
    }
  }, [job, polling, jobId])

  const loadJob = async () => {
    if (!jobId) return

    try {
      const jobData = await getJob(jobId)
      setJob(jobData)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load job'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-5 w-5" />
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-5 w-5" />
      case 'failed':
        return <XCircle className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getStatusVariant = (status: string) => {
    const variants: Record<string, "queued" | "running" | "completed" | "failed"> = {
      queued: 'queued',
      running: 'running',
      completed: 'completed',
      failed: 'failed',
    }
    return variants[status] || 'queued'
  }

  const calculateDuration = () => {
    if (!job?.metadata.started_at) return null
    const start = new Date(job.metadata.started_at).getTime()
    const end = job.metadata.completed_at 
      ? new Date(job.metadata.completed_at).getTime() 
      : Date.now()
    const duration = (end - start) / 1000
    if (duration < 60) return `${duration.toFixed(1)}s`
    return `${(duration / 60).toFixed(1)}m`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading job details...</p>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 text-red-400 px-6 py-4 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <p>{error || 'Job not found'}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Create
          </Link>
        </Button>
      </div>
    )
  }

  const Icon = pipelineIcons[job.pipeline] || Wand2
  const gradient = pipelineGradients[job.pipeline] || "from-gray-500 to-gray-600"
  const duration = calculateDuration()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/history">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Link>
      </Button>

      {/* Header Card */}
      <Card className="glass-card overflow-hidden">
        <div className={cn("h-2 bg-gradient-to-r", gradient)} />
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br",
                gradient
              )}>
                <Icon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground capitalize mb-1">
                  {job.pipeline.replace(/_/g, ' → ')}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{job.job_id.slice(0, 8)}...</span>
                  <button 
                    onClick={() => copyToClipboard(job.job_id)}
                    className="hover:text-foreground transition-colors"
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            <Badge variant={getStatusVariant(job.status)} className="flex items-center gap-1.5 px-3 py-1.5">
              {getStatusIcon(job.status)}
              {job.status.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Processing Animation */}
      {(job.status === 'queued' || job.status === 'running') && (
        <Card className="glass-card border-primary/30">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  {job.status === 'queued' ? 'Waiting in queue...' : 'Processing your request...'}
                </p>
                <p className="text-sm text-muted-foreground">This page will auto-update</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {job.status === 'failed' && job.metadata.error_message && (
        <Card className="glass-card border-destructive/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Error Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 rounded-lg p-4 text-sm text-red-400 font-mono">
              {job.metadata.error_message}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-5 w-5 text-primary" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium text-foreground">{formatDate(job.metadata.created_at)}</p>
              </div>
              {job.metadata.started_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="font-medium text-foreground">{formatDate(job.metadata.started_at)}</p>
                </div>
              )}
              {job.metadata.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-medium text-foreground">{formatDate(job.metadata.completed_at)}</p>
                </div>
              )}
              {duration && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" /> Duration
                  </p>
                  <p className="font-medium text-foreground">{duration}</p>
                </div>
              )}
            </div>
            {job.metadata.worker_used && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Workers Used</p>
                <div className="flex flex-wrap gap-2">
                  {job.metadata.worker_used.split(',').map((worker) => (
                    <Badge key={worker} variant="secondary" className="font-mono text-xs">
                      {worker.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Input */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Input
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.inputs.text && (
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-foreground whitespace-pre-wrap">{job.inputs.text}</p>
              </div>
            )}
            {job.inputs.audio_url && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground break-all">{job.inputs.audio_url}</p>
                <audio controls className="w-full">
                  <source src={job.inputs.audio_url} />
                </audio>
              </div>
            )}
            {job.inputs.image_url && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground break-all">{job.inputs.image_url}</p>
                <img src={job.inputs.image_url} alt="Input" className="rounded-lg max-h-64 object-contain" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outputs */}
      {job.status === 'completed' && (
        <Card className="glass-card border-success/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Output
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {job.outputs.text && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Generated Text
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(job.outputs.text || '')}
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{job.outputs.text}</p>
                </div>
              </div>
            )}

            {job.outputs.image_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Generated Image
                </p>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <img
                    src={job.outputs.image_url}
                    alt="Generated"
                    className="rounded-lg max-w-full h-auto mx-auto"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.onerror = null
                      target.src = ''
                      target.alt = 'Failed to load image'
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-2 break-all">{job.outputs.image_url}</p>
                </div>
              </div>
            )}

            {job.outputs.audio_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Generated Audio
                </p>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <audio controls className="w-full">
                    <source src={job.outputs.audio_url} type="audio/wav" />
                    <source src={job.outputs.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <p className="text-xs text-muted-foreground mt-2 break-all">{job.outputs.audio_url}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" asChild>
          <Link to="/">
            <Wand2 className="h-4 w-4 mr-2" />
            Create New Job
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/history">
            <Clock className="h-4 w-4 mr-2" />
            View History
          </Link>
        </Button>
      </div>
    </div>
  )
}
