import { getClientLocale, type Locale } from '@/i18n/client';

const messages = {
  en: {
    welcome: "Welcome to OpenAgentX! What's your name?",
    namePlaceholder: 'Enter your name...',
    nameError: 'Please enter a name between 1-100 characters.',
    passcodePromptSetup: 'Set a passcode (4-6 digits) to secure your account.',
    passcodePlaceholder: '4-6 digit number...',
    passcodeError: 'Please enter a 4-6 digit number.',
    modePrompt: 'How will you use OpenAgentX?',
    modeUser: 'I want to use services',
    modeProvider: 'I want to sell services',
    modeBoth: 'Both',
    modeLabelUser: 'User',
    modeLabelProvider: 'Provider',
    modeLabelBoth: 'Both',
    bootstrapSuccess: (bonus: string) =>
      `Great! Signup complete! Welcome bonus $${bonus} has been credited.\nSay anything to get started!`,
    bootstrapError: (msg?: string) => `Error: ${msg || 'Signup failed. Please try again.'}`,
    serverError: 'Server error occurred. Please try again.',
    loading: 'Loading...',
    thinking: 'Thinking...',
    send: 'Send',
    messagePlaceholder: 'Type a message...',
    emptyChat: (name: string) => `${name}, ask me anything!`,
    logout: 'Logout',
    welcomeBack: 'Welcome back!',
    passcodePrompt: (name: string) => `${name}, enter your passcode`,
    passcodeWrong: 'Incorrect passcode.',
    passcodeInputPlaceholder: 'Passcode (4-6 digits)',
    login: 'Log in',
    verifying: 'Verifying...',
    switchAccount: 'Use a different account',
    networkError: 'Network error. Please try again later.',
    noResponse: 'No response received. Please try again.',
  },
  ko: {
    welcome: '안녕하세요! OpenAgentX에 오신 걸 환영해요. 이름이 뭐예요?',
    namePlaceholder: '이름을 입력하세요...',
    nameError: '이름을 1~100자 사이로 입력해주세요.',
    passcodePromptSetup: '패스코드를 설정해주세요 (4~6자리 숫자)',
    passcodePlaceholder: '숫자 4~6자리...',
    passcodeError: '4~6자리 숫자를 입력해주세요.',
    modePrompt: '어떻게 사용하실 건가요?',
    modeUser: '뭔가를 시키고 싶어요 (사용자)',
    modeProvider: '내 서비스를 팔고 싶어요 (제공자)',
    modeBoth: '둘 다요',
    modeLabelUser: '사용자',
    modeLabelProvider: '제공자',
    modeLabelBoth: '전체',
    bootstrapSuccess: (bonus: string) =>
      `좋아요! 가입 완료! 환영 보너스 $${bonus}가 지급되었어요.\n이제 뭐든 말해보세요!`,
    bootstrapError: (msg?: string) => `오류: ${msg || '가입에 실패했어요. 다시 시도해주세요.'}`,
    serverError: '서버 오류가 발생했어요. 다시 시도해주세요.',
    loading: '로딩 중...',
    thinking: '생각 중...',
    send: '전송',
    messagePlaceholder: '메시지를 입력하세요...',
    emptyChat: (name: string) => `${name}님, 뭐든 물어보세요!`,
    logout: '나가기',
    welcomeBack: '다시 오셨군요!',
    passcodePrompt: (name: string) => `${name}님, 패스코드를 입력해주세요`,
    passcodeWrong: '패스코드가 틀렸습니다.',
    passcodeInputPlaceholder: '패스코드 (4~6자리)',
    login: '로그인',
    verifying: '확인 중...',
    switchAccount: '다른 계정으로 시작하기',
    networkError: '네트워크 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
    noResponse: '응답을 받지 못했어요. 다시 시도해주세요.',
  },
};

export type ChatMessages = typeof messages.en;

/** Detect locale: use app cookie first, then browser language, default English */
export function getChatLocale(): 'en' | 'ko' {
  // Try app's locale cookie first
  const appLocale = getClientLocale();
  if (appLocale === 'ko') return 'ko';
  if (appLocale === 'en') return 'en';

  // Fall back to browser language
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language?.toLowerCase() ?? '';
    if (lang.startsWith('ko')) return 'ko';
  }

  return 'en';
}

export function getChatMessages(locale?: 'en' | 'ko'): ChatMessages {
  const l = locale ?? getChatLocale();
  return messages[l] ?? messages.en;
}
