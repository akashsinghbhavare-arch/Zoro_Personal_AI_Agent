import { User, Conversation, Project, GeneratedImage } from '../types';

const STORAGE_KEYS = {
  USER: 'nova_ai_user',
  CONVERSATIONS: 'nova_ai_conversations',
  PROJECTS: 'nova_ai_projects',
  IMAGES: 'nova_ai_images',
  CURRENT_CONVERSATION: 'nova_ai_current_conversation',
};

// User storage
export const saveUser = (user: User): void => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const getUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  if (!data) return null;
  const user = JSON.parse(data) as User;
  
  // If user has no custom API key and selected a paid model or undefined, default to a free model
  if (!user.apiKey?.trim() && (!user.selectedModel || !user.selectedModel.endsWith(':free'))) {
    user.selectedModel = 'google/gemma-4-26b-a4b-it:free';
    saveUser(user);
  }
  return user;
};

// Conversations storage
export const saveConversations = (conversations: Conversation[]): void => {
  localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
};

export const getConversations = (): Conversation[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
  if (!data) return [];
  const parsed = JSON.parse(data);
  return parsed.map((conv: any) => ({
    ...conv,
    createdAt: new Date(conv.createdAt),
    updatedAt: new Date(conv.updatedAt),
    messages: conv.messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
  }));
};

export const saveCurrentConversation = (conversationId: string | null): void => {
  if (conversationId) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, conversationId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
  }
};

export const getCurrentConversation = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
};

// Projects storage
export const saveProjects = (projects: Project[]): void => {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
};

export const getProjects = (): Project[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!data) return [];
  const parsed = JSON.parse(data);
  return parsed.map((proj: any) => ({
    ...proj,
    createdAt: new Date(proj.createdAt),
  }));
};

// Images storage
export const saveImages = (images: GeneratedImage[]): void => {
  localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(images));
};

export const getImages = (): GeneratedImage[] => {
  const data = localStorage.getItem(STORAGE_KEYS.IMAGES);
  if (!data) return [];
  const parsed = JSON.parse(data);
  return parsed.map((img: any) => ({
    ...img,
    createdAt: new Date(img.createdAt),
  }));
};

// Initialize default user
export const initializeDefaultUser = (): User => {
  const existingUser = getUser();
  if (existingUser) return existingUser;
  
  const defaultUser: User = {
    username: 'Akash',
    email: 'akash@example.com',
    phone: '+1 (555) 123-4567',
    nickname: 'Akash',
    fullName: 'Akash Kumar',
    apiKey: '',
    groqApiKey: '',
    selectedModel: 'google/gemma-4-26b-a4b-it:free',
  };
  
  saveUser(defaultUser);
  return defaultUser;
};
