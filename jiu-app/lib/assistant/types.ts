export type TutorPage = 'home' | 'academy' | 'workshop' | 'collection' | 'community';
export type TutorIntent = 'explain' | 'example' | 'practice' | 'hint' | 'review';

export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface TutorPromptMeta { topic?: string; intent?: TutorIntent }
export interface MemoryItem { topic: string; summary: string; confidence: number; importance: number; lastUsedAt: number; createdAt: number }
export interface TutorContext {
  page: TutorPage; birdName?: string; levelId?: number; levelName?: string; levelGoal?: string; levelTip?: string; wrongStreak?: number;
  progress?: { completed: boolean; bestScore: number; attempts: number };
  workshop?: { idea?: string; lyrics?: string; genre?: string; mood?: string; instruments?: string[] };
}
export interface KnowledgeItem { id: string; title: string; content: string; tags: string[]; levelId?: number }
export type SuggestedAction = { kind: 'question'; label: string; prompt: string } | { kind: 'navigate'; label: string; href: '/workshop' };
export interface AgentReply { text: string; provider: 'api' | 'mock'; suggestions?: SuggestedAction[]; sourceIds?: string[]; topic?: string }
export interface TutorRequest { message: string; history: ChatMessage[]; context: TutorContext; knowledge?: KnowledgeItem[]; memory?: MemoryItem[]; recentMessages?: ChatMessage[]; learningSummary?: MemoryItem[]; promptMeta?: TutorPromptMeta }
export interface MusicTutorProvider { chat(request: TutorRequest): Promise<AgentReply>; stream?(request: TutorRequest): AsyncGenerator<string> }
