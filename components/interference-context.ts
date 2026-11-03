'use client';
import { createContext } from 'react';

// Keep the context identity separate from renderer edits during live previews.
export const AlignmentContext = createContext({ paused: false });
