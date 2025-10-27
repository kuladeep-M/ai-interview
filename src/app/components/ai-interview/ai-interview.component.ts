
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, AfterViewChecked, signal, WritableSignal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, Subject, switchMap } from 'rxjs';
import { VoiceService } from '../../services/speech.service';
import { AIStreamService } from '../../services/ai-stream.service';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

export type InputMode = 'speech' | 'text' | 'code';

@Component({
  selector: 'app-ai-interview',
  standalone: true,
  imports: [CommonModule, MonacoEditorModule, FormsModule],
  templateUrl: './ai-interview.component.html',
  styleUrls: ['./ai-interview.component.scss'],
})
export class AiInterviewComponent implements OnInit, AfterViewChecked, OnDestroy {
  ngOnDestroy(): void {
    this.speechService.stopRecording();
    this.speechService.stopSpeaking();
  }
  ngAfterViewChecked(): void {
    if (this.chatWindow && this.aiInFlight) {
      this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
    }
  }
  public selectedJobRole = '.NET Developer';
  public selectedExperienceLevel = '2-4 years';
  public selectedInterviewDuration = '10min';
  // Services
  private router = inject(Router);
  private userService = inject(UserService);
  private speechService = inject(VoiceService);
  private aiStreamService = inject(AIStreamService);

  // UI State
  chatWindow: HTMLElement | null = null;
  public showSidebar = true;
  public helperTools: WritableSignal<boolean> = signal(false);
  public userName = 'Kuladeep';
  public userSpeakingIndicator: WritableSignal<boolean> = signal(false);
  public showAISpeakingText: WritableSignal<boolean> = signal(true);
  public showUserSpeakingText: WritableSignal<boolean> = signal(true);
  public liveTranscript: WritableSignal<string> = signal('');
  public conversationHistory: { speaker: 'user' | 'ai', text: string, content: any }[] = [];
  public userTranscript: WritableSignal<string> = signal('Press mic to start speaking.');
  public aiSpeaking: WritableSignal<boolean> = signal(false);
  public isRecordingActive = false;
  public activeInputMode: WritableSignal<any> = signal('speech');
  public codeEditorContent = "// Sample JavaScript function\nfunction greet(name) {\n  return 'Hello, ' + name + '!';\n}\n\ngreet('World');";
  public userTranscriptValue = '';
  public selectedLanguage = 'javascript';
  public codeEditorOptions = {
    theme: 'vs',
    language: 'javascript',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    suggestOnTriggerCharacters: true,
    quickSuggestions: { other: true, comments: true, strings: true },
    wordBasedSuggestions: true,
    tabCompletion: 'on',
    acceptSuggestionOnEnter: 'on',
    snippetSuggestions: 'inline',
  };

  // Timer
  public timerSeconds: WritableSignal<number> = signal(0);
  private timerInterval: any = null;

  // Internal State
  private aiRequestSubject = new Subject<string>();
  private aiRequestSubscription: Subscription | null = null;
  private aiBuffer: string[] = [];
  public aiInFlight = false;
  private lastProcessedIndex = 0;
  private interimTranscriptBuffer = '';
  private finalTranscriptSegments: string[] = [];
  private transcriptQueue: string[] = [];
  private lastTranscriptChunk = '';
  private silenceTimeout: any = null;
  private recordSubscription: Subscription | null = null;

  ngOnInit(): void {
    const observer = new MutationObserver(() => {
      if (this.chatWindow) {
        this.chatWindow.scrollTop = this.chatWindow.scrollHeight;
      }
    });
    setTimeout(() => {
      const el = document.querySelector('.chat-window.minimal-chat') as HTMLElement;
      if (el) {
        this.chatWindow = el;
        observer.observe(el, { childList: true, subtree: true });
      }
    }, 0);
    this.speechService.stopSpeaking();
    this.timerSeconds.set(0);
    this.timerInterval = setInterval(() => {
      this.timerSeconds.update((s) => {
        if (s + 1 >= 1800) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          this.onEndInterview();
          return 1800;
        }
        return s + 1;
      });
    }, 1000);
    const sessionId = this.userService.sessionId;
    const user = this.userService.user;
    if (sessionId) {
      const payload = {
        candidate_name: user?.name,
        job_role: user?.role,
        experience_level: user?.experienceLevel,
        interview_duration: user?.interviewDuration,
        job_description: ''
      };

      this.aiStreamService.sendMessageToModel("I'm back, resume the interview.",JSON.stringify(payload, null, 2)).subscribe({
        next: async (aiResponse: {response: string}) => {
          let responseText = '';
          try {
            const parsed = JSON.parse(aiResponse?.response);
            responseText = parsed.message || '';
          } catch {
            responseText = 'something went wrong';
          }
          this.conversationHistory.push({ speaker: 'ai', text: responseText, content: aiResponse.response });
          const spokenText = responseText.replace(/#+\s*/g, '').replace(/\*{1,3}/g, '');
          this.speechService.speak(spokenText, 'en-IN').then(() => {
            if (this.activeInputMode() === 'speech') {
              setTimeout(() => {
                this.startRecording();
              }, 300);
            }
          });
        },
        error: (err) => {
          console.error('AI model error:', err);
        }
      });
    } else if (user) {
      const payload = {
        candidate_name: user.name,
        job_role: user.role,
        experience_level: user.experienceLevel,
        interview_duration: user.interviewDuration,
        job_description: ''
      };
      const firstMessage = `
${JSON.stringify(payload, null, 2)}

You are an AI Interviewer.
Use the above candidate and job details to conduct a technical interview aligned with the provided job role and description.
Begin by greeting the candidate warmly and then start the interview with your first question.`;
      this.aiStreamService.sendMessageToModel("Start Interview",firstMessage).subscribe({
        next:  (aiResponse: {response: string}) => {
          let responseText = '';
          try {
            const parsed = JSON.parse(aiResponse?.response);
            responseText = parsed.message || '';
          } catch {
            responseText = 'something went wrong';
          }
          this.conversationHistory.push({ speaker: 'ai', text: responseText,content: aiResponse.response });
          const spokenText = responseText.replace(/#+\s*/g, '').replace(/\*{1,3}/g, '');
          this.speechService.speak(spokenText, 'en-IN').then(() => {
            if (this.activeInputMode() === 'speech') {
              setTimeout(() => {
                this.startRecording();
              }, 300);
            }
          });
        },
        error: (err) => {
          console.error('AI model error:', err);
        }
      });
    }
  }

  get formattedTimer(): string {
    const min = Math.floor(this.timerSeconds() / 60);
    const sec = this.timerSeconds() % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  get userInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  toggleShowAISpeakingText(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.showAISpeakingText.set(input.checked);
  }

  toggleShowUserSpeakingText(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.showUserSpeakingText.set(input.checked);
  }

  onEndInterview(): void {
    this.conversationHistory.push({ speaker: 'user', text: 'End Interview', content: 'End interview' });
    this.aiStreamService.sendUserMessage('End Interview');
    this.userService.clearSessionId();
    this.userService.clearUser();
    console.log(this.conversationHistory);
    this.router.navigate(['/thank-you']);
  }

  onPassSkip(): void {
    this.conversationHistory.push({ speaker: 'user', text: 'skip this question', content: 'skip this question' });
    this.processUserResponse('skip this question');
  }

  onTextAreaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      this.submitAnswer();
      event.preventDefault();
    }
  }

  onLanguageChange(event: Event): void {
    this.codeEditorContent = "// New code template";
    const select = event.target as HTMLSelectElement;
    this.selectedLanguage = select.value;
    if ((window as any).monaco && (window as any).monaco.editor) {
      const model = (window as any).monaco.editor.getModels()[0];
      if (model) {
        (window as any).monaco.editor.setModelLanguage(model, this.selectedLanguage);
      }
    }
    this.codeEditorOptions = {
      ...this.codeEditorOptions,
      language: this.selectedLanguage,
    };
  }

  setInputMode(mode: InputMode): void {
    const currentMode = this.activeInputMode();
    if (currentMode === mode) {
      this.activeInputMode.set('speech');
      this.startRecording();
      return;
    }
    this.activeInputMode.set(mode);
    if (mode === 'speech') {
      this.startRecording();
    } else {
      this.speechService.pauseRecording();
      this.isRecordingActive = false;
    }
  }

  toggleInputMode(): void {
    this.activeInputMode.update((mode) => (mode === 'speech' ? 'code' : 'speech'));
    if (this.activeInputMode() === 'code') {
      this.stopRecording();
    }
  }

  onCodeEditorChange(ev: any): void {
    if (typeof ev === 'string') {
      this.codeEditorContent = ev;
    } else if (ev && typeof ev.value === 'string') {
      this.codeEditorContent = ev.value;
    }
  }

  submitAnswer(): void {
    this.speechService.stopSpeaking();
    let response = '';
    if (this.activeInputMode() === 'text') {
      response = this.userTranscriptValue;
      this.userTranscript.set(response);
      this.conversationHistory.push({ speaker: 'user', text: response, content: response });
      this.processUserResponse(response);
      this.userTranscriptValue = '';
    } else if (this.activeInputMode() === 'code') {
      response = this.codeEditorContent;
      console.log('[DEBUG] Code submitted:', response);
      this.conversationHistory.push({ speaker: 'user', text: 'code submitted', content: response });
      this.processUserResponse(response);
      this.activeInputMode.set('speech');
    } else {
      response = this.userTranscript();
    }
    this.aiStreamService.sendUserMessage(response);
    console.log(`SUBMITTED RESPONSE (Mode: ${this.activeInputMode()}):`, response);
  }

  processUserResponse(userMessage: string): void {
    if (this.aiInFlight) {
      this.aiBuffer.push(userMessage);
      this.aiRequestSubject.next('');
    } else {
      this.aiBuffer = [userMessage];
      this.lastProcessedIndex = 0;
      if (!this.aiRequestSubscription) {
        this.aiRequestSubscription = this.aiRequestSubject.pipe(
          switchMap(() => {
            const unsentMessages = this.aiBuffer.slice(this.lastProcessedIndex);
            const combined = unsentMessages.join(' ');
            this.aiInFlight = true;
            if (this.isRecordingActive) {
              this.speechService.pauseRecording();
              this.isRecordingActive = false;
            }
            return this.aiStreamService.sendMessageToModel(combined);
          })
        ).subscribe({
          next: async (aiResponse: {response: string}) => {
            let responseText = '';
            try {
              const parsed = JSON.parse(aiResponse.response);
              responseText = parsed.message || '';
            } catch {
              responseText = "something went wrong";
            }
            this.aiInFlight = false;
              this.conversationHistory.push({ speaker: 'ai', text: responseText, content: aiResponse.response });
              const spokenText = responseText.replace(/#+\s*/g, '').replace(/\*{1,3}/g, '');
              this.speechService.speak(spokenText, 'en-IN').then(() => {
                if (this.activeInputMode() === 'speech') {
                  this.speechService.startRecording();
                  this.isRecordingActive = true;
                }
              });
              this.lastProcessedIndex = 0;
              this.aiBuffer = [];
          },
          error: (err) => {
            console.error('AI model error:', err);
            this.aiInFlight = false;
          },
          complete: () => {
            // If there are still buffered messages, process them
            if (this.aiBuffer.length > 0) {
              const unsentMessages = this.aiBuffer.slice(this.lastProcessedIndex);
              if (unsentMessages.length > 0) {
                const combined = unsentMessages.join(' ');
                this.lastProcessedIndex = this.aiBuffer.length;
                this.aiInFlight = true;
                if (this.isRecordingActive) {
                  this.speechService.pauseRecording();
                  this.isRecordingActive = false;
                }
                this.aiStreamService.sendMessageToModel(combined).subscribe({
                  next: async (aiResponse: {response: string}) => {
                    let responseText = '';
                    try {
                      const parsed = JSON.parse(aiResponse.response);
                      responseText = parsed.message || '';
                    } catch {
                      responseText = "something went wrong";
                    }
                    this.aiInFlight = false;
                    setTimeout(() => {
                      this.conversationHistory.push({ speaker: 'ai', text: responseText , content: aiResponse.response  });
                      const spokenText = responseText.replace(/#+\s*/g, '').replace(/\*{1,3}/g, '');
                      this.speechService.speak(spokenText, 'en-IN').then(() => {
                        if (this.activeInputMode() === 'speech') {
                          this.speechService.startRecording();
                          this.isRecordingActive = true;
                        }
                      });
                      this.lastProcessedIndex = 0;
                      this.aiBuffer = [];
                    }, 0);
                  },
                  error: (err) => {
                    console.error('AI model error:', err);
                    this.aiInFlight = false;
                  },
                  complete: () => {
                    this.aiInFlight = false;
                  }
                });
              } else {
                this.aiInFlight = false;
              }
            } else {
              this.aiInFlight = false;
            }
          }
        });
        this.aiRequestSubject.next('');
      } else {
        this.aiRequestSubject.next('');
      }
    }
  }

  startRecording(): void {
  this.speechService.stopSpeaking();
    this.aiSpeaking.set(false);
    if (!this.recordSubscription) {
      this.recordSubscription = this.speechService.record$.subscribe({
        next: (results: any) => {
            if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
          }
          if (Array.isArray(results)) {
            this.interimTranscriptBuffer = '';
            for (const result of results) {
              if (Array.isArray(result)) {
                for (const alt of result) {
                  if (alt && alt.transcript) {
                    const segment = alt.transcript.trim();
                    if (!alt.isFinal) {
                      this.interimTranscriptBuffer += (this.interimTranscriptBuffer ? ' ' : '') + segment;
                    } else {
                      if (segment && !this.finalTranscriptSegments.includes(segment)) {
                        this.finalTranscriptSegments.push(segment);
                      }
                    }
                  }
                }
              } else if (result && result[0] && result[0].transcript) {
                const segment = result[0].transcript.trim();
                if (!result.isFinal) {
                  this.interimTranscriptBuffer += (this.interimTranscriptBuffer ? ' ' : '') + segment;
                } else {
                  if (segment && !this.finalTranscriptSegments.includes(segment)) {
                    this.finalTranscriptSegments.push(segment);
                  }
                }
              }
            }
            this.liveTranscript.set(this.interimTranscriptBuffer);
            let finalSegment = '';
            for (const result of results) {
              if (Array.isArray(result)) {
                for (const alt of result) {
                  if (alt.isFinal && alt.transcript) {
                    finalSegment += (finalSegment ? ' ' : '') + alt.transcript.trim();
                  }
                }
              } else if (result && result.isFinal && result[0] && result[0].transcript) {
                finalSegment += (finalSegment ? ' ' : '') + result[0].transcript.trim();
              }
            }
            if (finalSegment) {
              if (!this.finalTranscriptSegments.includes(finalSegment)) {
                this.finalTranscriptSegments.push(finalSegment);
              }
              // Add to queue and show in chat immediately
              this.transcriptQueue.push(finalSegment);
              this.userTranscript.set(this.finalTranscriptSegments.join(' '));
              this.lastTranscriptChunk = this.finalTranscriptSegments.join(' ');
              this.conversationHistory.push({ speaker: 'user', text: finalSegment , content: finalSegment });
              this.interimTranscriptBuffer = '';
              this.liveTranscript.set('');
              this.userSpeakingIndicator.set(true);
              setTimeout(() => {
                this.userSpeakingIndicator.set(false);
              }, 1000);
              // Do NOT process immediately; let silenceTimeout handle it
            }
          }
          const fullTranscript = this.finalTranscriptSegments.join(' ');
          if (fullTranscript) {
            this.userTranscript.set(fullTranscript);
            this.lastTranscriptChunk = fullTranscript;
          }
        
          this.silenceTimeout = setTimeout(() => {
            if (this.transcriptQueue.length > 0) {
              // Clear live transcript immediately when processing
              this.liveTranscript.set('');
              const combined = this.transcriptQueue.join(' ');
              this.userTranscript.set(combined);
              this.processUserResponse(combined);
              this.finalTranscriptSegments = [];
              this.transcriptQueue = [];
            }
            this.finalTranscriptSegments = [];
          }, 8000);
        },
        error: (err) => {
          console.error('Recording error:', err);
          this.stopRecording();
        },
        complete: () => {
          // Optionally handle completion, e.g., cleanup
          this.stopRecording();
        }
      });
    }
    this.speechService.startRecording();
    this.isRecordingActive = this.speechService.isRecordingActive;
  }

  pauseRecording(): void {
    if (!this.recordSubscription || !this.isRecordingActive) return;
    this.speechService.pauseRecording();
    this.isRecordingActive = this.speechService.isRecordingActive;
  }

  stopRecording(): void {
    if (this.recordSubscription) {
      this.recordSubscription.unsubscribe();
      this.recordSubscription = null;
    }
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    this.speechService.stopRecording();
    this.isRecordingActive = this.speechService.isRecordingActive;
  }

  toggleRecording(): void {
    this.activeInputMode.set('speech');
    this.speechService.stopSpeaking();
    if (this.speechService.isRecordingActive) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
    this.isRecordingActive = this.speechService.isRecordingActive;
  }

  getAiMessageParts(text: string): { question: string, rest: string, code: string } {
    let formatted = text;
    formatted = formatted.replace(/```([\s\S]*?)```/g, (m, code) => {
      return `<pre class='ai-code-block'><code>${code.trim()}</code></pre>`;
    });
    formatted = formatted.replace(/###\s*([^\n]+)/g, (m, header) => {
      return `<div class='ai-header'><i>${header.trim()}</i></div>`;
    });
    formatted = formatted.replace(/\*\*\*([^*]+)\*\*\*/g, (m, boldText) => {
      return `<b>${boldText.trim()}</b>&nbsp;`;
    });
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (m, q) => {
      return `<div class='ai-question'><b>${q.trim()}</b></div>`;
    });
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    return { question: '', rest: formatted, code: '' };
  }
}
