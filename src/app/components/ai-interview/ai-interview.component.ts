import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal, ChangeDetectorRef } from '@angular/core';
import { map, Subscription } from 'rxjs';
import { VoiceService } from '../../services/voice.service';
export type InputMode = 'speech' | 'text' | 'code';
// ai-interview.component.ts
@Component({
  selector: 'app-ai-interview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-interview.component.html',
  styleUrls: ['./ai-interview.component.scss'],
})
export class AiInterviewComponent implements OnInit {
  public helperTools: WritableSignal<boolean> = signal(false);
  public userName: string = 'Kuladeep';
  get userInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
  }
  public userSpeakingIndicator: WritableSignal<boolean> = signal(false);
  public showAISpeakingText: WritableSignal<boolean> = signal(true);
  public showUserSpeakingText: WritableSignal<boolean> = signal(true);
  // ...existing code...
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
  private draftConfidence: number = 0;
  // Removed debounce feature
  // Removed draftTranscript feature
  public conversationHistory: { speaker: 'user' | 'ai', text: string }[] = [];
  private finalTranscriptSegments: string[] = [];
  private lastTranscriptChunk: string = '';
  private speechService = inject(VoiceService);
  private recordSubscription: Subscription | null = null;

  // UI State Signals
  public userTranscript: WritableSignal<string> = signal('Press mic to start speaking.');
  private transcriptBuffer: string = '';
  private silenceTimeout: any = null;
  public aiSpeaking: WritableSignal<boolean> = signal(false);
  public isRecordingActive: boolean = false;

  // Input Mode State
  public activeInputMode: WritableSignal<any> = signal('speech');
  public codeEditorContent: WritableSignal<string> = signal('');

  ngOnInit(): void {
    // TODO: Any initial subscriptions (e.g., to a greeting stream)
  }

  /**
   * Cycles the recording state: Start -> Pause -> Resume -> Stop (on error/external stop).
   */
  toggleRecording(): void {
    if (this.activeInputMode() === 'code') return; // Ignore if in code mode

    if (this.recordSubscription && this.isRecordingActive) {
      // State 1: Currently Listening -> PAUSE
      this.pauseRecording();
    } else if (this.recordSubscription && !this.isRecordingActive) {
      // State 2: Paused -> RESUME (by calling startRecording)
      this.startRecording();
    } else {
      // State 3: Stopped/Initial -> START
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
   * Handles changes in the code editor textarea.
   */
  onCodeEditorChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.codeEditorContent.set(textarea.value);
  }
  setInputMode(mode: InputMode): void {
    if (this.activeInputMode() === mode) {
      // Optional: Toggle back to speech if the same button is clicked
      this.activeInputMode.set('speech');
      this.startRecording();
    } else {
      this.activeInputMode.set(mode);

      // When switching *away* from speech, pause the continuous mic.
      if (mode !== 'speech') {
        this.speechService.pauseRecording();
        this.isRecordingActive = false;
      } else {
        // When switching *to* speech, resume the continuous mic.
        this.startRecording();
      }
    }
  }
  /**
   * Placeholder for the logic that happens after a transcript is received.
   */
  private processUserResponse(transcript: string): void {
    // Stop listening after a final result is received (optional, based on flow)
    // this.stopRecording();
    console.log('prcoessing',transcript)
    this.aiSpeaking.set(true);
    // Use the service to generate a mock speech response
    const aiText = 'Processing your response...';
    this.conversationHistory.push({ speaker: 'ai', text: aiText });
    this.speechService.speak(aiText).then(() => {
      this.aiSpeaking.set(false);
      // After AI speaks, either automatically resume or wait for user input
    });
  }

  /**
   * Handles the final submission, whether it's transcribed speech or written code.
   */
  submitAnswer(): void {
    const response =
      this.activeInputMode() === 'speech' ? this.userTranscript() : this.codeEditorContent();

    console.log(`SUBMITTED RESPONSE (Mode: ${this.activeInputMode()}): ${response}`);
    // TODO: Send response to backend for evaluation
  }

  ngOnDestroy(): void {
    this.stopRecording();
    // TODO: Unsubscribe from other service streams if needed
  }
}
