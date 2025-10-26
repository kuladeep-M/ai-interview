import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { map, Subscription, Subject, switchMap } from 'rxjs';
import { VoiceService } from '../../services/voice.service';
import { AIStreamService } from '../../services/ai-stream.service';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

export type InputMode = 'speech' | 'text' | 'code';
// ai-interview.component.ts

@Component({
  selector: 'app-ai-interview',
  standalone: true,
  imports: [CommonModule, MonacoEditorModule, FormsModule],
  templateUrl: './ai-interview.component.html',
  styleUrls: ['./ai-interview.component.scss'],
  // No providers needed for ngx-monaco-editor-v2
})
export class AiInterviewComponent implements OnInit {
  chatWindow: HTMLElement | null = null;
  /**
   * Handles End Interview button click: adds message to chat, makes API call, and navigates to thank you screen.
   */
  private router = inject(Router);
    private userService = inject(UserService);

  onEndInterview(): void {
    this.conversationHistory.push({ speaker: 'user', text: 'End Interview' });
    this.aiStreamService.sendUserMessage('End Interview');
    this.userService.clearSessionId();
    this.userService.clearUser();
    // Navigate to thank you screen using Angular Router
    this.router.navigate(['/thank-you']);
  }
  /**
   * Handles Pass/Skip button click: adds message to chat and makes API call.
   */
  onPassSkip(): void {
    this.conversationHistory.push({ speaker: 'user', text: 'Pass / Skip' });
    this.processUserResponse('Pass / Skip');
  }
  // For text input Enter key submit
  onTextAreaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      this.submitAnswer();
      event.preventDefault();
    }
  }
  // For text input binding
  public userTranscriptValue: string = '';
  private aiRequestSubject = new Subject<string>();
  private aiRequestSubscription: Subscription | null = null;
  private aiBuffer: string[] = [];
  public aiInFlight = false;
  private lastProcessedIndex = 0;

  processUserResponse(userMessage: string): void {
    if (this.aiInFlight) {
      // Buffer messages only while a request is in-flight
      this.aiBuffer.push(userMessage);
      this.aiRequestSubject.next(''); // Cancel and trigger new request
    } else {
      // No request in-flight, reset buffer and processed index
      this.aiBuffer = [userMessage];
      this.lastProcessedIndex = 0;
      if (!this.aiRequestSubscription) {
        this.aiRequestSubscription = this.aiRequestSubject.pipe(
          switchMap(() => {
            const unsentMessages = this.aiBuffer.slice(this.lastProcessedIndex);
            const combined = unsentMessages.join(' ');
            this.aiInFlight = true;
            // Pause mic before AI speaks
            if (this.isRecordingActive) {
              this.speechService.pauseRecording();
              this.isRecordingActive = false;
            }
            return this.aiStreamService.sendMessageToModel(combined);
          })
        ).subscribe({
          next: async (aiResponse: string) => {
            let responseText = '';
            try {
              const parsed = JSON.parse(aiResponse);
              responseText = parsed.response || '';
            } catch {
              responseText = aiResponse;
            }
            this.conversationHistory.push({ speaker: 'ai', text: responseText });
            // Remove markdown before speaking
            const spokenText = responseText.replace(/#+\s*/g, '').replace(/\*{1,3}/g, '');
            await this.speechService.speak(spokenText, 'en-IN');
            if (this.activeInputMode() === 'speech') {
              this.speechService.startRecording();
              this.isRecordingActive = true;
            }
            // After success, mark all messages as processed and clear buffer
            this.lastProcessedIndex = 0;
            this.aiBuffer = [];
            this.aiInFlight = false;
          },
          error: (err) => {
            console.error('AI model error:', err);
            this.aiInFlight = false;
          }
        });
        // Trigger the first request immediately after subscription setup
        this.aiRequestSubject.next('');
      } else {
        this.aiRequestSubject.next('');
      }
    }
  }
  public selectedLanguage: string = 'javascript';
  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedLanguage = select.value;
    // Dynamically set Monaco editor language for suggestions
    // This requires accessing the editor instance
    if ((window as any).monaco && (window as any).monaco.editor) {
      const model = (window as any).monaco.editor.getModels()[0];
      if (model) {
        (window as any).monaco.editor.setModelLanguage(model, this.selectedLanguage);
      }
    }
    this.codeEditorOptions = {
      ...this.codeEditorOptions,
      language: this.selectedLanguage
    };
  }
  public codeEditorOptions = {
    theme: 'vs', // Use Monaco's default light theme
    language: 'javascript',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    suggestOnTriggerCharacters: true,
    quickSuggestions: { other: true, comments: true, strings: true },
    wordBasedSuggestions: true,
    tabCompletion: 'on',
    acceptSuggestionOnEnter: 'on',
    snippetSuggestions: 'inline'
  };
  public showSidebar: boolean = true;

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }
  // Timer state
  public timerSeconds: WritableSignal<number> = signal(0);
  private timerInterval: any = null;
  public helperTools: WritableSignal<boolean> = signal(false);
  public userName: string = 'Kuladeep';
  get userInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
  }
  public userSpeakingIndicator: WritableSignal<boolean> = signal(false);
  public showAISpeakingText: WritableSignal<boolean> = signal(true);
  public showUserSpeakingText: WritableSignal<boolean> = signal(true);
  // Place this method inside the class, after properties and before lifecycle hooks or other methods
  toggleShowAISpeakingText(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.showAISpeakingText.set(input.checked);
  }
  toggleShowUserSpeakingText(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.showUserSpeakingText.set(input.checked);
  }
  private interimTranscriptBuffer: string = '';
  public liveTranscript: WritableSignal<string> = signal('');
  // Removed ChangeDetectorRef injection; signals now handle reactivity
  public draftTranscript: string = '';
  // Removed debounce feature
  // Removed draftTranscript feature
  public conversationHistory: { speaker: 'user' | 'ai', text: string }[] = [];
  private finalTranscriptSegments: string[] = [];
  private lastTranscriptChunk: string = '';
  private speechService = inject(VoiceService);
  private aiStreamService = inject(AIStreamService);
  private wsUrl = 'ws://localhost:8080'; // Change to your AI backend WebSocket URL
  private recordSubscription: Subscription | null = null;
  private aiStreamSubscription: Subscription | null = null;

  // UI State Signals
  public userTranscript: WritableSignal<string> = signal('Press mic to start speaking.');
  private transcriptBuffer: string = '';
  private silenceTimeout: any = null;
  public aiSpeaking: WritableSignal<boolean> = signal(false);
  public isRecordingActive: boolean = false;

  // Input Mode State
  public activeInputMode: WritableSignal<any> = signal('speech');
  public codeEditorContent = "// Sample JavaScript function\nfunction greet(name) {\n  return 'Hello, ' + name + '!';\n}\n\ngreet('World');";
   ngOnInit(): void {
    // Scroll to bottom when new message is added
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
    // Stop any ongoing AI speech on reload/init
    this.speechService.stopSpeaking();
    // Start timer when interview screen loads
    this.timerSeconds.set(0);
    this.timerInterval = setInterval(() => {
      this.timerSeconds.update((s) => {
        // If timer reaches 30 minutes (1800 seconds), end interview
        if (s + 1 >= 1800) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          this.onEndInterview();
          return 1800;
        }
        return s + 1;
      });
    }, 1000);

    // Prevent duplicate API calls for new users
    const sessionId = this.userService.sessionId;
    const user = this.userService.user;
    // If sessionId exists and user data exists, treat as returning user
    if (sessionId) {
      this.aiStreamService.sendMessageToModel("I'm back").subscribe({
        next: async (aiResponse: string) => {
          let responseText = '';
          try {
            const parsed = JSON.parse(aiResponse);
            responseText = parsed.response || '';
          } catch {
            responseText = aiResponse;
          }
          this.conversationHistory.push({ speaker: 'ai', text: responseText });
          const spokenText = responseText.replace(/#+\s*/g, '').replace(/\*{1,3}/g, '');
          await this.speechService.speak(spokenText, 'en-IN');
          if (this.activeInputMode() === 'speech') {
            this.isRecordingActive = true;
            this.speechService.startRecording();
          }
        },
        error: (err) => {
          console.error('AI model error:', err);
        }
      });
    } else if (user) {
      // Only send first prompt for new users (no sessionId in localStorage)
      const payload = {
        candidate_name: user.name,
        job_role: user.role,
        experience_level: '',
        job_description: ''
      };
      const firstMessage = `
${JSON.stringify(payload, null, 2)}

You are an AI Interviewer.
Use the above candidate and job details to conduct a technical interview aligned with the provided job role and description.
Begin by greeting the candidate warmly and then start the interview with your first question.`;
      this.aiStreamService.sendMessageToModel(firstMessage).subscribe({
        next: async (aiResponse: string) => {
          let responseText = '';
          try {
            const parsed = JSON.parse(aiResponse);
            responseText = parsed.response || '';
          } catch {
            responseText = aiResponse;
          }
          this.conversationHistory.push({ speaker: 'ai', text: responseText });
          const spokenText = responseText.replace(/#+\s*/g, '').replace(/\*{1,3}/g, '');
          await this.speechService.speak(spokenText, 'en-IN');
          if (this.activeInputMode() === 'speech') {
            this.speechService.startRecording();
            this.isRecordingActive = true;
          }
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

  /**
   * Cycles the recording state: Start -> Pause -> Resume -> Stop (on error/external stop).
   */
  toggleRecording(): void {

    // Always switch to speech mode and start recording when mic is clicked
    this.activeInputMode.set('speech');
    this.speechService.stopSpeaking();
    if (this.isRecordingActive) {
      this.pauseRecording();
    } else {
      this.startRecording();
    }
  }
  startRecording(): void {
    // Stop AI speaking immediately when user starts speaking
    this.aiSpeaking.set(false);
    if (!this.recordSubscription) {
      // 1. Initial Start: Subscribe to the service's stream once
      this.recordSubscription = this.speechService.record$.subscribe({
        next: (results: any) => {
          // Extract transcript text from SpeechRecognitionResult objects

          // Use finalized segments for transcript and UI, and draft based on highest confidence
          if (Array.isArray(results)) {
            // Use a persistent buffer for interim transcript
            this.interimTranscriptBuffer = '';
            for (const result of results) {
              if (Array.isArray(result)) {
                for (const alt of result) {
                  if (alt && alt.transcript) {
                    const segment = alt.transcript.trim();
                    if (!alt.isFinal) {
                      // Accumulate interim segments
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
            // Show accumulated interim transcript
            this.liveTranscript.set(this.interimTranscriptBuffer);
            // Only clear buffer and liveTranscript if a final segment is present in the current results
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
              // Immediately update chat history and finalized transcript
              if (!this.finalTranscriptSegments.includes(finalSegment)) {
                this.finalTranscriptSegments.push(finalSegment);
              }
              this.userTranscript.set(this.finalTranscriptSegments.join(' '));
              this.lastTranscriptChunk = this.finalTranscriptSegments.join(' ');
              this.conversationHistory.push({ speaker: 'user', text: this.lastTranscriptChunk });
              this.processUserResponse(this.lastTranscriptChunk);
              this.interimTranscriptBuffer = '';
              this.liveTranscript.set('');
              this.userSpeakingIndicator.set(true);
              setTimeout(() => {
                this.userSpeakingIndicator.set(false);
              }, 1000);
              this.finalTranscriptSegments = [];
            }
          }
          console.log('[DEBUG] Final:', this.finalTranscriptSegments, 'Live:', this.liveTranscript);
          // Show the concatenated transcript in UI
          const fullTranscript = this.finalTranscriptSegments.join(' ');
          if (fullTranscript) {
            this.userTranscript.set(fullTranscript);
            this.lastTranscriptChunk = fullTranscript;
          }
          // Reset silence timer
          if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
          }
          this.silenceTimeout = setTimeout(() => {
            // After 5 seconds of silence, process the full concatenated transcript
            const fullTranscript = this.finalTranscriptSegments.join(' ');
            if (fullTranscript) {
              this.userTranscript.set(fullTranscript);
              // Store user speech in conversation history
              this.conversationHistory.push({ speaker: 'user', text: fullTranscript });
              this.processUserResponse(fullTranscript);
            }
            this.transcriptBuffer = '';
            this.finalTranscriptSegments = [];
            // Do NOT stop recording; keep it active for ongoing interview
          }, 5000);
        },
        error: (err) => {
          console.error('Recording error:', err);
          this.stopRecording();
        },
      });
    }

    // 2. Activate the stream (This is how we RESUME or START)
    this.speechService.startRecording();
    this.isRecordingActive = true;
  }

  pauseRecording(): void {
    if (!this.recordSubscription || !this.isRecordingActive) return;

    // Call the service to deactivate the stream
    this.speechService.pauseRecording();
    this.isRecordingActive = false;
  }

  stopRecording(): void {
    // Fully unsubscribe from the stream to end the session
    if (this.recordSubscription) {
      this.recordSubscription.unsubscribe();
      this.recordSubscription = null;
    }
    // Clear transcript buffer and silence timer
    this.transcriptBuffer = '';
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    // Tell the service to fully stop
    this.speechService.stopRecording();
    this.isRecordingActive = false;
  }

  /**
   * Toggles the input mode between 'speech' and 'code'.
   */
  toggleInputMode(): void {
    this.activeInputMode.update((mode) => (mode === 'speech' ? 'code' : 'speech'));

    // Stop recording immediately when switching away from speech mode
    if (this.activeInputMode() === 'code') {
      this.stopRecording();
    }
  }

  /**
   * Handles changes in the code editor (Monaco).
   * Accepts either a string or NgxEditorModel.
   */
  onCodeEditorChange(ev: any): void {
    // ngx-monaco-editor (modelChange) emits the new value directly
    if (typeof ev === 'string') {
      this.codeEditorContent = ev;
    } else if (ev && typeof ev.value === 'string') {
      this.codeEditorContent = ev.value;
    }
  }
  setInputMode(mode: InputMode): void {
    // Only one input mode can be active at a time
    // If the selected mode is already active, revert to 'speech' mode
    const currentMode = this.activeInputMode();
    if (currentMode === mode) {
      this.activeInputMode.set('speech');
      this.startRecording();
      return;
    }

    // Set the selected mode as active
    this.activeInputMode.set(mode);

    // Handle recording state based on mode
    if (mode === 'speech') {
      this.startRecording();
    } else {
      this.speechService.pauseRecording();
      this.isRecordingActive = false;
    }
  }
  

  /**
   * Handles the final submission, whether it's transcribed speech or written code.
   */
  submitAnswer(): void {
    // Stop any ongoing AI speech immediately on submit
    this.speechService.stopSpeaking();
    let response = '';
    if (this.activeInputMode() === 'text') {
      response = this.userTranscriptValue;
      this.userTranscript.set(response);
      this.conversationHistory.push({ speaker: 'user', text: response });
      this.processUserResponse(response);
      this.userTranscriptValue = '';
    } else if (this.activeInputMode() === 'code') {
      response = this.codeEditorContent;
      // Debug log: show actual code value being submitted
      console.log('[DEBUG] Code submitted:', response);
      // Show 'code' as string in UI, but push actual code to array
      this.conversationHistory.push({ speaker: 'user', text: 'code submitted' });
      this.processUserResponse(response);
      // Switch off code mode after submit
      this.activeInputMode.set('speech');
    } else {
      response = this.userTranscript();
      // Speech mode already handled elsewhere
    }
    // Optionally send to backend for evaluation
    this.aiStreamService.sendUserMessage(response);
    console.log(`SUBMITTED RESPONSE (Mode: ${this.activeInputMode()}):`, response);
  }

  ngOnDestroy(): void {
    this.stopRecording();
    // Stop any ongoing AI speech on destroy
    this.speechService.stopSpeaking();
    // TODO: Unsubscribe from other service streams if needed
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.aiStreamService.disconnect();
    if (this.aiStreamSubscription) {
      this.aiStreamSubscription.unsubscribe();
      this.aiStreamSubscription = null;
    }
  }
  getAiMessageParts(text: string): { question: string, rest: string, code: string } {
    // Preserve original sequence, only format bolded question and code blocks
    let formatted = text;

    // Format code blocks (triple backticks)
    formatted = formatted.replace(/```([\s\S]*?)```/g, (m, code) => {
      return `<pre class='ai-code-block'><code>${code.trim()}</code></pre>`;
    });

    // Format text between ### as italic (markdown header)
    formatted = formatted.replace(/###\s*([^\n]+)/g, (m, header) => {
      return `<div class='ai-header'><i>${header.trim()}</i></div>`;
    });

    // Format text between *** as bold
    formatted = formatted.replace(/\*\*\*([^*]+)\*\*\*/g, (m, boldText) => {
      return `<b>${boldText.trim()}</b>&nbsp;`;
    });

    // Format bolded question (double asterisks)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, (m, q) => {
      return `<div class='ai-question'><b>${q.trim()}</b></div>`;
    });

    // Format inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    return { question: '', rest: formatted, code: '' };
  }
}
