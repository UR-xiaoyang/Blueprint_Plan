import { create } from 'zustand';
import { AIPlanRequest } from '../services/aiService';
import { Plan } from '../App';

type Step = 'input' | 'generating' | 'preview';

interface AIPlanState {
  step: Step;
  request: AIPlanRequest;
  generatedPlan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'> | null;
  chatInput: string;
  isModifying: boolean;
  chatHistory: ChatMessage[];
  showChatHistory: boolean;
  
  setStep: (step: Step) => void;
  setRequest: (request: AIPlanRequest | ((prev: AIPlanRequest) => AIPlanRequest)) => void;
  setGeneratedPlan: (plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'progress'> | null) => void;
  setChatInput: (input: string) => void;
  setIsModifying: (isModifying: boolean) => void;
  addChatMessage: (role: 'user' | 'assistant', content: string) => void;
  toggleChatHistory: () => void;
  reset: () => void;
  initializeWithPlan: (plan: Plan) => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const DEFAULT_REQUEST: AIPlanRequest = {
  goal: '',
  duration: '1 month',
  intensity: 'medium'
};

export const useAIPlanStore = create<AIPlanState>((set) => ({
  step: 'input',
  request: DEFAULT_REQUEST,
  generatedPlan: null,
  chatInput: '',
  isModifying: false,
  chatHistory: [],
  showChatHistory: false,

  setStep: (step) => set({ step }),
  setRequest: (request) => set((state) => ({ 
    request: typeof request === 'function' ? request(state.request) : request 
  })),
  setGeneratedPlan: (generatedPlan) => set({ generatedPlan }),
  setChatInput: (chatInput) => set({ chatInput }),
  setIsModifying: (isModifying) => set({ isModifying }),
  addChatMessage: (role, content) => set((state) => ({
    chatHistory: [
      ...state.chatHistory,
      {
        id: Math.random().toString(36).substring(7),
        role,
        content,
        timestamp: Date.now()
      }
    ]
  })),
  toggleChatHistory: () => set((state) => ({ showChatHistory: !state.showChatHistory })),
  reset: () => set({
    step: 'input',
    request: DEFAULT_REQUEST,
    generatedPlan: null,
    chatInput: '',
    isModifying: false,
    chatHistory: [],
    showChatHistory: false
  }),
  initializeWithPlan: (plan) => set({
    step: 'preview',
    request: {
      goal: plan.title, // Use title as goal for context
      duration: 'custom',
      intensity: 'medium'
    },
    generatedPlan: {
      title: plan.title,
      description: plan.description,
      tasks: plan.tasks,
      startDate: plan.startDate,
      endDate: plan.endDate,
      status: plan.status
    },
    chatInput: '',
    isModifying: false,
    chatHistory: [],
    showChatHistory: false
  })
}));
