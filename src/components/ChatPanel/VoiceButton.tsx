import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
}

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  : null;

export const VoiceButton: React.FC<VoiceButtonProps> = ({ onTranscript, language = 'en-US', disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(!!SpeechRecognitionAPI);
  const recognitionRef = useRef<unknown>(null);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI || disabled) return;
    const recognition = new (SpeechRecognitionAPI as new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((event: unknown) => void) | null;
      onend: (() => void) | null;
      onerror: ((event: unknown) => void) | null;
      start: () => void;
      stop: () => void;
    })();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: unknown) => {
      const e = event as { resultIndex: number; results: Array<{ isFinal: boolean; 0: { transcript: string } }> };
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      }
      if (finalTranscript) onTranscript(finalTranscript.trim());
    };

    recognition.onend = () => { setIsListening(false); };
    recognition.onerror = () => { setIsListening(false); };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onTranscript, language, disabled]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current as { stop: () => void } | null;
    rec?.stop();
    setIsListening(false);
  }, []);

  if (!isSupported) return null;

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      title={isListening ? 'Stop recording' : 'Voice input'}
      aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 10,
        border: `1px solid ${isListening ? 'rgba(239,68,68,0.4)' : 'rgba(100,116,139,0.2)'}`,
        background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(30,30,50,0.4)',
        color: isListening ? '#ef4444' : '#64748b',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
    </button>
  );
};
