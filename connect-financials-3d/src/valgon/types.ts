import type { PageId } from '../config/pages';

/** One thing Valgon does after (or while) answering. */
export type ValgonStep =
  /** Open a page, optionally at one of its sections */
  | { go: PageId; section?: string }
  /** Glide the pointer to an element and ring it in gold */
  | { spot: string }
  /** Say something more */
  | { say: string }
  /** Open the Open Account form, optionally on a tier */
  | { openAccount: true; tier?: string }
  /** Select an instrument in Connect View */
  | { instrument: string }
  | { wait: number };

export interface ValgonLink {
  label: string;
  href: string;
}

/** What a brain (local knowledge or a remote service) returns. */
export interface ValgonReply {
  /** Spoken and written in the conversation */
  say: string;
  steps?: ValgonStep[];
  /** Shown as buttons under the answer (email, Telegram…) */
  links?: ValgonLink[];
  /** Follow-up questions offered as chips */
  suggestions?: string[];
}

export interface ValgonLine {
  id: number;
  who: 'valgon' | 'me';
  text: string;
  links?: ValgonLink[];
}

export interface BrainContext {
  page: PageId;
  history: ValgonLine[];
}

/** A built-in intent: when the question matches, respond. */
export interface Intent {
  id: string;
  /** Strong signals: any match scores 3 */
  patterns: RegExp[];
  /** Weak signals: each word found scores 1 */
  keywords?: string[];
  /** Added to the score: breaks ties between intents that both match */
  priority?: number;
  /** Extra condition checked after a pattern matches */
  when?: (message: string) => boolean;
  respond: (message: string, ctx: BrainContext) => ValgonReply;
}
