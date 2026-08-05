export interface User {
  username: string;
  email: string;
  phone: string;
  nickname: string;
  fullName: string;
  apiKey?: string;
  geminiApiKey?: string;
  groqApiKey?: string;
  selectedModel?: string;
  aiProvider?: 'gemini' | 'openrouter';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  createdAt: Date;
}
