# Pipeline Architecture

## Supported Pipelines

### 1. Text-to-Text (text_to_text)
**Purpose**: Generate or transform text using LLM

**Flow**:
```
User Input (text) → LLM Worker → Generated Text
```

**Worker**: `llm-worker`
**External API**: OpenRouter (GPT models)

**Use Cases**:
- Text generation
- Text summarization
- Prompt rewriting/enhancement

---

### 2. Text-to-Image (text_to_image)
**Purpose**: Generate images from text prompts

**Flow**:
```
User Input (text) → [Optional: LLM Worker for prompt enhancement] → Image Worker → Generated Image
```

**Workers**: 
- `llm-worker` (optional, for style enhancement)
- `image-worker`

**External API**: Hugging Face Inference API (Stable Diffusion XL)

**Options**:
- `style`: Style modifier (e.g., "cinematic", "realistic")
- `quality`: "low", "medium", "high"
- `aspect_ratio`: "1:1", "16:9", "9:16" (TODO)

---

### 3. Text-to-Speech (text_to_speech)
**Purpose**: Convert text to speech audio

**Flow**:
```
User Input (text) → TTS Worker → Generated Audio
```

**Worker**: `tts-worker`
**External API**: Hugging Face Inference API (TTS models)

**Options**:
- `language`: Language code (e.g., "en", "es", "fr")

---

### 4. Speech-to-Text (speech_to_text)
**Purpose**: Transcribe speech audio to text

**Flow**:
```
User Input (audio_url) → STT Worker → Transcribed Text
```

**Worker**: `stt-worker`
**External API**: Hugging Face Inference API (Whisper Large v3)

**Options**:
- `language`: Language code (optional, for better accuracy)

---

### 5. Speech-to-Image (speech_to_image)
**Purpose**: Generate images from speech input (multi-step pipeline)

**Flow**:
```
User Input (audio_url) 
  → STT Worker (transcribe speech to text)
  → LLM Worker (clean up and enhance prompt)
  → Image Worker (generate image)
  → Generated Image + Transcribed Text
```

**Workers**: `stt-worker`, `llm-worker`, `image-worker`

**This pipeline demonstrates composition**:
- Step 1: Speech transcription
- Step 2: Prompt enhancement/cleaning
- Step 3: Image generation

**Output**: Both transcribed text and generated image

---

### 6. Image-to-Image (image_to_image)
**Purpose**: Transform image style (CycleGAN-style)

**Flow**:
```
User Input (image_url) → CycleGAN Worker → Transformed Image
```

**Worker**: `cyclegan-worker`
**External API**: Hugging Face Inference API (image transformation models)

**Options**:
- `style`: Style transformation to apply

**Note**: This is a placeholder implementation. True CycleGAN requires specialized model endpoints.

---

## Pipeline Composition Pattern

Pipelines are composed by the `PipelineExecutor` in the Gateway service:

```python
async def _speech_to_image(job: Job) -> Job:
    # Step 1: STT
    stt_result = await self._call_worker(stt_worker_url, "generate", {...})
    
    # Step 2: LLM enhancement
    enhanced = await self._call_worker(llm_worker_url, "generate", {...})
    
    # Step 3: Image generation
    image_result = await self._call_worker(image_worker_url, "generate", {...})
    
    # Combine results
    job.outputs.text = stt_result["text"]
    job.outputs.image_url = image_result["image_url"]
    return job
```

## Error Handling

- Each pipeline step can fail independently
- Gateway tracks partial results
- Failed pipelines set `job.status = "failed"` with error message
- Intermediate results may still be stored (e.g., transcribed text even if image generation fails)

## Future Pipeline Extensions

Potential pipelines that can be added:
- **Image-to-Text**: Image captioning
- **Text-to-Video**: Video generation from text
- **Audio-to-Audio**: Audio style transfer
- **Multi-modal Search**: Search across text, images, audio

All follow the same pattern: compose worker services sequentially or in parallel.
