'use server';

/**
 * @fileOverview A RIPS validation error analysis AI agent.
 *
 * - analyzeValidationError - A function that handles the error analysis process.
 * - AnalyzeValidationErrorInput - The input type for the analyzeValidationError function.
 * - AnalyzeValidationErrorOutput - The return type for the analyzeValidationError function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeValidationErrorInputSchema = z.object({
  fileName: z.string().describe('The name of the RIPS file.'),
  segment: z.string().describe('The segment where the error occurred (e.g., AF, AM).'),
  expected: z.number().describe('The expected number of records according to the CT file.'),
  found: z.number().describe('The actual number of records found in the segment.'),
  fileContent: z.string().describe('Content of the RIPS file'),
});
export type AnalyzeValidationErrorInput = z.infer<typeof AnalyzeValidationErrorInputSchema>;

const AnalyzeValidationErrorOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe(
      'A ranked list of suggestions for correcting the validation error.'
    ),
  analysis: z.string().describe('The AI analysis of the error context.'),
});
export type AnalyzeValidationErrorOutput = z.infer<typeof AnalyzeValidationErrorOutputSchema>;

export async function analyzeValidationError(
  input: AnalyzeValidationErrorInput
): Promise<AnalyzeValidationErrorOutput> {
  return analyzeValidationErrorFlow(input);
}

const analyzeValidationErrorPrompt = ai.definePrompt({
  name: 'analyzeValidationErrorPrompt',
  input: {schema: AnalyzeValidationErrorInputSchema},
  output: {schema: AnalyzeValidationErrorOutputSchema},
  prompt: `You are an AI assistant specializing in analyzing RIPS (Registro Individual de Prestación de Servicios de Salud) file validation errors.

  A RIPS file named "{{fileName}}" has failed validation. Specifically, the segment "{{segment}}" was expected to have {{expected}} records, but only {{found}} were found.
  Here is the content of the RIPS file:
  {{fileContent}}
  Analyze the error, considering the file content and the discrepancy between expected and found record counts.
  Provide a ranked list of potential reasons for this discrepancy and suggest corrections or areas to investigate.
  Return the output in JSON format with 'suggestions' as a ranked list of potential fixes and 'analysis' providing a brief explanation of the error context.
  `,
});

const analyzeValidationErrorFlow = ai.defineFlow(
  {
    name: 'analyzeValidationErrorFlow',
    inputSchema: AnalyzeValidationErrorInputSchema,
    outputSchema: AnalyzeValidationErrorOutputSchema,
  },
  async input => {
    const {output} = await analyzeValidationErrorPrompt(input);
    return output!;
  }
);
