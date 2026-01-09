
export interface Archetype {
  id: string;
  goal: string;
  displayName: string;
  description: string;
  icon?: React.ReactNode; // Optional: For a potential future icon
}

export interface LikertOption {
  text: string;
  value: number;
}

export type SurveyAnswers = Record<number, number>; // questionIndex: score
