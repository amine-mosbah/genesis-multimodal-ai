import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listJobs, Job } from '../api'
import { Card, CardContent } from '@/components/ui/card'
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
  ChevronRight,
  History,
  Plus,
  RefreshCw
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

export default function JobHistory() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      setLoading(true)
      setError(null)
      const jobList = await listJobs()
      setJobs(jobList)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load jobs'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
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

  const getInputPreview = (job: Job) => {
    if (job.inputs.text) {
      return job.inputs.text.slice(0, 80) + (job.inputs.text.length > 80 ? '...' : '')
    }
    if (job.inputs.audio_url) return 'Audio file'
    if (job.inputs.image_url) return 'Image file'
    return 'No input'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading your jobs...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 text-red-400 px-6 py-4 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
        <Button variant="outline" onClick={loadJobs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            Job History
          </h1>
          <p className="text-muted-foreground">
            View and manage your generation jobs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadJobs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/">
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Link>
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-foreground">No jobs yet</h3>
              <p className="text-muted-foreground max-w-md">
                Start creating amazing content with our AI pipelines. Your generation history will appear here.
              </p>
            </div>
            <Button asChild className="mt-4">
              <Link to="/">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job, index) => {
            const Icon = pipelineIcons[job.pipeline] || Wand2
            const gradient = pipelineGradients[job.pipeline] || "from-gray-500 to-gray-600"
            
            return (
              <Link
                key={job.job_id}
                to={`/jobs/${job.job_id}`}
                className={cn(
                  "group block opacity-0 animate-slide-up"
                )}
                style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <Card className="glass-card hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      {/* Pipeline Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br",
                        gradient
                      )}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>

                      {/* Job Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-foreground capitalize">
                            {job.pipeline.replace(/_/g, ' → ')}
                          </h3>
                          <Badge variant={getStatusVariant(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {getInputPreview(job)}
                        </p>
                      </div>

                      {/* Timestamp & Arrow */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatDate(job.metadata.created_at)}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    {/* Output Preview for completed jobs */}
                    {job.status === 'completed' && job.outputs.text && (
                      <div className="px-4 pb-4">
                        <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground line-clamp-2">
                          {job.outputs.text}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
