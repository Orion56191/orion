
export enum Theme {
  WINTER = 'winter',
  MONSOON = 'monsoon',
  DAYBREAK = 'daybreak',
}

export type Language = 'zh' | 'en';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLiked?: boolean;
  isDisliked?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface OrionResponse {
  text_response?: string;
  output?: string;
  [key: string]: any;
}

export const API_CONFIG = {
  // 切换回测试 URL (webhook-test) 以便在 N8N 编辑器中调试
  // 注意：发送消息前必须在 N8N 点击 "Execute"
  ENDPOINT: "https://a164182930.app.n8n.cloud/webhook-test/chat",
  KEY: "164182930qwas"
};
