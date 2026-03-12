export interface Unit {
  id: string;
  number: number;
  title: string;
  targetGrammar: string;
  vocabulary: string[];
  course: 'Intermediate 1' | 'Intermediate 2';
}

export interface StoryScene {
  text: string;
  visualPrompt: string;
  imageUrl?: string;
  audioBase64?: string;
  highlights: {
    text: string;
    type: 'grammar' | 'vocabulary';
    explanation: string;
  }[];
}

export interface ConversionOutput {
  scenes: StoryScene[];
  learningReport: {
    grammarHighlights: string[];
    vocabularyMatches: string[];
  };
  mentoring: {
    missingTopics: string[];
    improvements: string[];
  };
  structureMap: string;
}

export interface AppState {
  rawInput: string;
  format: 'Dialogue' | 'Monologue';
  selectedUnitId: string;
  output?: ConversionOutput;
  isProcessing: boolean;
}
