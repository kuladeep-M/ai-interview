// speech-automation.service.ts - FINAL IMPLEMENTATION

import { Injectable, OnDestroy, Inject } from '@angular/core';
import { NEVER, Observable, repeat, retry, share, Subject, switchMap, tap } from 'rxjs';
import {
  continuous,
  final,
  SPEECH_SYNTHESIS_VOICES,
  SpeechRecognitionService,
  takeUntilSaid,
} from '@ng-web-apis/speech';

@Injectable({ providedIn: 'root' })
export class VoiceService implements OnDestroy {
  // Internal Triggers and Subjects
  private readonly recordingTrigger$ = new Subject<boolean>();
  private readonly isSpeakingSubject = new Subject<boolean>();

  // Public State Observable for the AI Agent's status
  readonly isSpeaking$: Observable<boolean> = this.isSpeakingSubject.asObservable();
  private readonly synthesis: SpeechSynthesis = window.speechSynthesis;
  recognition$: Observable<SpeechRecognitionResult[]>;
  constructor(
    @Inject(SPEECH_SYNTHESIS_VOICES)
    readonly voices$: Observable<ReadonlyArray<SpeechSynthesisVoice>>,
    @Inject(SpeechRecognitionService)
    private readonly rawRecognition$: Observable<SpeechRecognitionResult[]>
  ) {
    this.recognition$ = this.rawRecognition$.pipe(
      retry(),
      repeat(),
      share());


  }

  get record$() {
    return this.recordingTrigger$.pipe(
      // switchMap is CRITICAL: when trigger is TRUE, switch to mic stream; when FALSE, switch to NEVER (stops emitting)
      switchMap(isRecording => isRecording ? this.recognition$ : NEVER),
      // The value 'text' here is already a string, so no need for map((m) => m.transcript)
    );
  }

  speak(text: string, lang = 'en-US'): Promise<void> {
    // 1. Set AI Agent state to TRUE
    this.isSpeakingSubject.next(true);

    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      // Force Indian English only
      utter.lang = 'en-IN';
      // Always try to select Indian English voice
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(v => v.lang === 'en-IN');
      if (indianVoice) {
        utter.voice = indianVoice;
      }
      // If not found, will use 'en-IN' language with default voice
      utter.onend = () => {
        this.isSpeakingSubject.next(false);
        resolve();
      };
      this.synthesis.speak(utter);
      console.log('speakinggg')
    });
  }

  startRecording(): void {
    // 2. Activate the User's recording stream
    this.recordingTrigger$.next(true);
    console.log('listening')
  }

  pauseRecording(): void {
    this.recordingTrigger$.next(false);
  }

  stopRecording(): void {
    this.recordingTrigger$.next(false);
  }

  stopSpeaking(): void {
    window.speechSynthesis.cancel();
    this.isSpeakingSubject.next(false);
  }

  ngOnDestroy(): void {
    this.stopRecording();
    this.recordingTrigger$.complete();
    this.isSpeakingSubject.complete();
  }
}
