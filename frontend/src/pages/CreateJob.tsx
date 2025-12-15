import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createJob, listPipelines, Pipeline, JobCreate } from '../api'

export default function CreateJob() {
  const navigate = useNavigate()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Input states
  const [textInput, setTextInput] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  
  // Options
  const [style, setStyle] = useState('')
  const [language, setLanguage] = useState('en')
  const [quality, setQuality] = useState('high')

  useEffect(() => {
    loadPipelines()
  }, [])

  const loadPipelines = async () => {
    try {
      const data = await listPipelines()
      setPipelines(data.pipelines)
      if (data.pipelines.length > 0) {
        setSelectedPipeline(data.pipelines[0].type)
      }
    } catch (err) {
      setError('Failed to load pipelines')
      console.error(err)
    }
  }

  const getInputFields = () => {
    if (!selectedPipeline) return null

    if (selectedPipeline.includes('text_to_text') || 
        selectedPipeline.includes('text_to_image') || 
        selectedPipeline.includes('text_to_speech')) {
      return (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Text Input</label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter your text..."
          />
        </div>
      )
    }

    if (selectedPipeline.includes('speech_to_text') || 
        selectedPipeline.includes('speech_to_image')) {
      return (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Audio URL</label>
          <input
            type="text"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="https://example.com/audio.wav"
          />
          <p className="mt-1 text-sm text-gray-500">
            Note: Direct audio file URLs are required. File upload will be added in a future version.
          </p>
        </div>
      )
    }

    if (selectedPipeline.includes('image_to_image')) {
      return (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Image URL</label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="https://example.com/image.png"
          />
          <p className="mt-1 text-sm text-gray-500">
            Note: Direct image URLs are required. File upload will be added in a future version.
          </p>
        </div>
      )
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const inputs: any = {}
      if (textInput) inputs.text = textInput
      if (imageUrl) inputs.image_url = imageUrl
      if (audioUrl) inputs.audio_url = audioUrl

      const options: any = {}
      if (style) options.style = style
      if (language) options.language = language
      if (quality) options.quality = quality

      const jobCreate: JobCreate = {
        pipeline: selectedPipeline,
        inputs,
        options: Object.keys(options).length > 0 ? options : undefined
      }

      const job = await createJob(jobCreate)
      navigate(`/jobs/${job.job_id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Generation Job</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Pipeline Type</label>
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.type} value={pipeline.type}>
                  {pipeline.type} - {pipeline.description}
                </option>
              ))}
            </select>
          </div>

          {getInputFields()}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Style (optional)</label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g., cinematic, realistic, anime"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading || !selectedPipeline}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
