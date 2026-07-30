export interface AcademyGameProps {
  onComplete: (score: number) => void;
  onMistake: () => void;
  simpleMode: boolean;
}

export type AcademyGameComponent = React.ComponentType<AcademyGameProps>;
