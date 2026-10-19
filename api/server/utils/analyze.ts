import {
  type AnalysisResult,
  type AnalyzeRequest,
  countSentences,
  modelOutputSchema,
} from '@pdf-insight/shared'
import { splitIntoChunks } from './chunking'
import { type GeminiConfig, generateStructured } from './gemini'
import { mergeOutputs } from './merge'
import { buildResult } from './postprocess'
import { ANALYSIS_SYSTEM_PROMPT, MERGE_SYSTEM_PROMPT, documentParts } from './prompts'

const finalPartSchema = modelOutputSchema.pick({ summary: true, keyPoints: true })

function checkSummaryLength({ summary }: { summary: string }): string | null {
  const sentences = countSentences(summary)
  return sentences >= 3 && sentences <= 5 ? null : `ma ${sentences} zdań zamiast 3–5`
}

export async function analyzeDocument(
  request: AnalyzeRequest,
  config: GeminiConfig,
): Promise<AnalysisResult> {
  const chunks = splitIntoChunks(request.pages, request.ocrPages)
  const pageCount = request.pages.length

  // fragmenty analizujemy równolegle, żeby zmieścić się w ~30 s także dla długich PDF-ów
  const partials = await Promise.all(
    chunks.map((chunk) =>
      generateStructured(config, {
        system: ANALYSIS_SYSTEM_PROMPT,
        schema: modelOutputSchema,
        check: checkSummaryLength,
        parts: documentParts(
          chunk.text,
          chunks.length === 1
            ? `File name: ${request.fileName}. Pages: ${pageCount}.`
            : `File name: ${request.fileName}. This is a FRAGMENT (pages ${chunk.firstPage}–${chunk.lastPage} of ${pageCount}) of a longer document.`,
        ),
      }),
    ),
  )

  let output = partials[0]?.data
  let softIssue = partials[0]?.softIssue ?? null
  if (!output) throw new Error('analyzeDocument: brak wyników')

  if (partials.length > 1) {
    const final = await generateStructured(config, {
      system: MERGE_SYSTEM_PROMPT,
      schema: finalPartSchema,
      check: checkSummaryLength,
      parts: [
        {
          text: JSON.stringify(
            partials.map(({ data }) => ({ summary: data.summary, keyPoints: data.keyPoints })),
          ),
        },
      ],
    })
    output = mergeOutputs(
      partials.map((p) => p.data),
      final.data,
    )
    softIssue = final.softIssue
  }

  return buildResult({
    output,
    sourceText: request.pages.join('\n'),
    fileName: request.fileName,
    pageCount,
    ocrPages: request.ocrPages,
    model: config.model,
    chunks: chunks.length,
    softIssue,
  })
}
