import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getJob, Job } from '../api'

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    if (jobId) {
      loadJob()
    }
  }, [jobId])

  useEffect(() => {
    if (!polling || !jobId) return

    // Poll for job updates if job is still processing
    if (job && (job.status === 'queued' || job.status === 'running')) {
      const interval = setInterval(() => {
        loadJob()
      }, 2000) // Poll every 2 seconds

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
    } catch (err: any) {
      setError(err.message || 'Failed to load job')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-gray-100 text-gray-800',
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[status] || colors.queued}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">Loading job...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Job not found'}
        </div>
        <Link to="/" className="mt-4 text-indigo-600 hover:text-indigo-500">
          ← Back to Create Job
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <Link to="/" className="text-indigo-600 hover:text-indigo-500 mb-4 inline-block">
        ← Back to Create Job
      </Link>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Job Details</h2>
          {getStatusBadge(job.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Job Information</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Job ID</dt>
                <dd className="text-sm text-gray-900 font-mono">{job.job_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Pipeline</dt>
                <dd className="text-sm text-gray-900">{job.pipeline}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="text-sm text-gray-900">{formatDate(job.metadata.created_at)}</dd>
              </div>
              {job.metadata.started_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Started At</dt>
                  <dd className="text-sm text-gray-900">{formatDate(job.metadata.started_at)}</dd>
                </div>
              )}
              {job.metadata.completed_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Completed At</dt>
                  <dd className="text-sm text-gray-900">{formatDate(job.metadata.completed_at)}</dd>
                </div>
              )}
              {job.metadata.worker_used && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Worker(s)</dt>
                  <dd className="text-sm text-gray-900">{job.metadata.worker_used}</dd>
                </div>
              )}
            </dl>
          </div>

          {job.status === 'failed' && job.metadata.error_message && (
            <div>
              <h3 className="text-lg font-medium text-red-900 mb-2">Error</h3>
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {job.metadata.error_message}
              </div>
            </div>
          )}
        </div>

        {job.inputs && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Inputs</h3>
            <div className="bg-gray-50 rounded p-4">
              {job.inputs.text && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-500">Text: </span>
                  <span className="text-sm text-gray-900">{job.inputs.text}</span>
                </div>
              )}
              {job.inputs.image_url && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-500">Image URL: </span>
                  <span className="text-sm text-gray-900 break-all">{job.inputs.image_url}</span>
                </div>
              )}
              {job.inputs.audio_url && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Audio URL: </span>
                  <span className="text-sm text-gray-900 break-all">{job.inputs.audio_url}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {job.status === 'completed' && job.outputs && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Outputs</h3>
            <div className="space-y-4">
              {job.outputs.text && (
                <div>
                  <span className="text-sm font-medium text-gray-500 block mb-1">Generated Text:</span>
                  <div className="bg-gray-50 rounded p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.outputs.text}</p>
                  </div>
                </div>
              )}
              {job.outputs.image_url && (
                <div>
                  <span className="text-sm font-medium text-gray-500 block mb-1">Generated Image:</span>
                  <div className="bg-gray-50 rounded p-4">
                    <img
                      src={job.outputs.image_url}
                      alt="Generated"
                      className="max-w-full h-auto rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `<p class="text-sm text-red-600">Failed to load image. URL: ${job.outputs.image_url}</p>`
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              {job.outputs.audio_url && (
                <div>
                  <span className="text-sm font-medium text-gray-500 block mb-1">Generated Audio:</span>
                  <div className="bg-gray-50 rounded p-4">
                    <audio controls className="w-full">
                      <source src={job.outputs.audio_url} type="audio/wav" />
                      <source src={job.outputs.audio_url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <p className="text-xs text-gray-500 mt-2">URL: {job.outputs.audio_url}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {job.status === 'queued' || job.status === 'running' ? (
          <div className="mt-6 text-center text-sm text-gray-500">
            Job is processing... This page will auto-refresh.
          </div>
        ) : null}
      </div>
    </div>
  )
}
