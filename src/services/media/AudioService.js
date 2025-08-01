import { IAudioService } from '../../interfaces/IMediaServices.js';

/**
 * Audio Service Implementation
 * Single Responsibility: Handle text-to-speech functionality
 * Open/Closed: Extensible for different audio backends
 * Liskov Substitution: Can substitute IAudioService
 * Interface Segregation: Focused audio interface
 * Dependency Inversion: Depends on audio abstraction
 */
export class AudioService extends IAudioService {
    constructor() {
        super();
        this.synth = window.speechSynthesis;
        this.isEnabled = true;
        this.currentLanguage = 'fr-FR';
        this.availableLanguages = {
            'fr-FR': 'Français',
            'en-US': 'English',
            'de-DE': 'Deutsch',
            'es-ES': 'Español'
        };
        this.voices = [];
        this.init();
    }

    // Initialization (KISS - simple setup)
    init() {
        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                this.voices = this.synth.getVoices();
            };
        }
        if (this.synth) {
            this.voices = this.synth.getVoices();
        }
    }

    // Core Audio Methods
    speak(text, language = this.currentLanguage) {
        if (!this.isEnabled || !this.synth || !text) return;

        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        const voice = this.voices.find(v => v.lang.startsWith(language.split('-')[0]));
        if (voice) {
            utterance.voice = voice;
        }

        this.synth.speak(utterance);
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled && this.synth) {
            this.synth.cancel();
        }
        return this.isEnabled;
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }

    // Utility Methods
    setLanguage(language) {
        if (this.availableLanguages[language]) {
            this.currentLanguage = language;
        }
    }

    getAvailableLanguages() {
        return this.availableLanguages;
    }
}